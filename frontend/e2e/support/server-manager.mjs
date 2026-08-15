import { closeSync, existsSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { frontendDir, serverStatePath } from "./runtime.mjs";

function killProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (process.platform === "win32") {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // O processo pode ter terminado antes do teardown.
    }
    spawnSync("taskkill.exe", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // O processo pode ter terminado antes do teardown.
  }
}

export function assertPortAvailable(port, label) {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.once("error", (error) => {
      if (error.code === "EADDRINUSE") {
        reject(new Error(
          `A porta ${port} (${label}) ja esta em uso. `
          + `Defina PAC_E2E_${label.toUpperCase()}_PORT com outra porta `
          + "ou use PAC_E2E_EXTERNAL_SERVERS=1."
        ));
        return;
      }
      reject(error);
    });
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

export function cleanupManagedServers() {
  if (!existsSync(serverStatePath)) return;
  try {
    const state = JSON.parse(readFileSync(serverStatePath, "utf8"));
    [...(state.pids || [])].reverse().forEach(killProcessTree);
  } finally {
    rmSync(serverStatePath, { force: true });
  }
}

export function launchManagedProcess(command, args, { cwd, env, label }) {
  const logPath = path.join(frontendDir, ".e2e", `${label}.log`);
  const log = openSync(logPath, "a");
  try {
    const child = spawn(command, args, {
      cwd,
      env,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", log, log],
    });
    if (!child.pid) throw new Error(`Nao foi possivel iniciar ${label}.`);
    child.unref();
    return child.pid;
  } finally {
    closeSync(log);
  }
}

export function saveManagedServers(pids) {
  writeFileSync(serverStatePath, JSON.stringify({ pids }, null, 2), "utf8");
}

export async function waitForUrl(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Servidor nao respondeu em ${url}: ${lastError?.message || "timeout"}`);
}
