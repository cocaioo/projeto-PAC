import { mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  backendDir,
  backendEnv,
  databaseIsInsideRuntime,
  databasePath,
  frontendDir,
  pythonExecutable,
  runtimeDir,
  serverPythonRuntime,
  supportDir,
} from "./runtime.mjs";
import {
  assertPortAvailable,
  cleanupManagedServers,
  launchManagedProcess,
  saveManagedServers,
  waitForUrl,
} from "./server-manager.mjs";

function runPython(args, label) {
  const result = spawnSync(pythonExecutable(), args, {
    cwd: backendDir,
    env: backendEnv,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${label} falhou com codigo ${result.status ?? "desconhecido"}.`);
  }
}

export default async function globalSetup() {
  cleanupManagedServers();
  const backendPort = Number(process.env.PAC_E2E_BACKEND_PORT || 8000);
  const frontendPort = Number(process.env.PAC_E2E_FRONTEND_PORT || 4173);
  await assertPortAvailable(backendPort, "backend");
  await assertPortAvailable(frontendPort, "frontend");
  mkdirSync(runtimeDir, { recursive: true });
  if (process.env.PAC_E2E_KEEP_DATABASE !== "1") {
    if (!databaseIsInsideRuntime) {
      throw new Error(
        "PAC_E2E_DATABASE precisa apontar para frontend/.e2e/ para permitir o reset. "
        + "Use PAC_E2E_KEEP_DATABASE=1 se o banco externo foi preparado explicitamente."
      );
    }
    rmSync(databasePath, { force: true });
  }
  runPython(["manage.py", "migrate", "--noinput"], "Migracao do banco E2E");
  runPython([path.join(supportDir, "seed_e2e.py")], "Carga da massa E2E");

  const pids = [];
  try {
    const serverPython = serverPythonRuntime();
    pids.push(launchManagedProcess(
      serverPython.executable,
      ["manage.py", "runserver", `127.0.0.1:${backendPort}`, "--noreload"],
      { cwd: backendDir, env: serverPython.env, label: "backend" }
    ));
    pids.push(launchManagedProcess(
      process.execPath,
      [path.join(frontendDir, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", String(frontendPort)],
      { cwd: frontendDir, env: process.env, label: "frontend" }
    ));
    saveManagedServers(pids);
    await Promise.all([
      waitForUrl(`http://127.0.0.1:${backendPort}/api/auth/csrf/`),
      waitForUrl(`http://127.0.0.1:${frontendPort}/`),
    ]);
  } catch (error) {
    saveManagedServers(pids);
    cleanupManagedServers();
    throw error;
  }
}
