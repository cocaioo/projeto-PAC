import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const supportDir = path.dirname(fileURLToPath(import.meta.url));
export const frontendDir = path.resolve(supportDir, "../..");
export const repositoryDir = path.resolve(frontendDir, "..");
export const backendDir = path.join(repositoryDir, "backend");
export const runtimeDir = path.join(frontendDir, ".e2e");
const configuredDatabaseUrl =
  process.env.PAC_E2E_DATABASE_URL || process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error(
    "Defina PAC_E2E_DATABASE_URL para executar os E2E em um banco isolado."
  );
}

const databaseName = new URL(configuredDatabaseUrl).pathname.replace(/^\//u, "");
if (
  databaseName === "pac_db"
  && process.env.PAC_E2E_ALLOW_SHARED_DATABASE !== "1"
) {
  throw new Error(
    "O banco pac_db é compartilhado. Use PAC_E2E_DATABASE_URL com um banco E2E isolado."
  );
}

export const databaseUrl = configuredDatabaseUrl;
export const serverStatePath = path.join(runtimeDir, "servers.json");

export function pythonExecutable() {
  if (process.env.PAC_E2E_PYTHON) return process.env.PAC_E2E_PYTHON;
  const candidates = process.platform === "win32"
    ? [path.join(repositoryDir, "venv", "Scripts", "python.exe")]
    : [path.join(repositoryDir, "venv", "bin", "python")];
  return candidates.find(existsSync) || (process.platform === "win32" ? "python.exe" : "python3");
}

const frontendPort = Number(process.env.PAC_E2E_FRONTEND_PORT || 4173);
const frontendOrigin = new URL(
  process.env.PAC_E2E_BASE_URL || `http://127.0.0.1:${frontendPort}`
).origin;
export const backendEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  DJANGO_DEBUG: "True",
  DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1",
  DJANGO_CORS_ALLOWED_ORIGINS: frontendOrigin,
  DJANGO_CSRF_TRUSTED_ORIGINS: frontendOrigin,
  DJANGO_SECRET_KEY: "e2e-only-secret-key-not-for-production",
  PAC_E2E_PASSWORD: process.env.PAC_E2E_PASSWORD || "Pac-E2E-Only-2026!",
};

export function serverPythonRuntime() {
  const selectedPython = pythonExecutable();
  if (process.platform !== "win32" || !selectedPython.toLowerCase().includes("\\scripts\\python.exe")) {
    return { executable: selectedPython, env: backendEnv };
  }

  const probe = spawnSync(
    selectedPython,
    [
      "-c",
      "import json,sys; print(json.dumps({'base': sys._base_executable, 'site': next(p for p in sys.path if 'site-packages' in p)}))",
    ],
    { encoding: "utf8", windowsHide: true }
  );
  if (probe.status !== 0) {
    throw new Error("Nao foi possivel resolver o Python-base do ambiente virtual E2E.");
  }
  const resolved = JSON.parse(probe.stdout.trim());
  return {
    executable: resolved.base,
    env: {
      ...backendEnv,
      VIRTUAL_ENV: path.resolve(path.dirname(selectedPython), ".."),
      PYTHONPATH: [resolved.site, backendEnv.PYTHONPATH].filter(Boolean).join(path.delimiter),
    },
  };
}
