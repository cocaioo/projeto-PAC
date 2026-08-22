import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const frontendDir = process.cwd();
const serverEntry = path.join(frontendDir, "performance", "lighthouse-server.mjs");
const lhciEntry = path.join(frontendDir, "node_modules", "@lhci", "cli", "src", "cli.js");

function startServer() {
  const server = spawn(process.execPath, [serverEntry], {
    cwd: frontendDir,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  const ready = new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error("O servidor do Lighthouse não ficou pronto em 30 segundos."));
    }, 30_000);

    const inspect = (chunk, destination) => {
      const text = chunk.toString();
      destination.write(text);
      output += text;
      if (output.includes("PAC Lighthouse server ready")) {
        clearTimeout(timeout);
        resolve();
      }
    };

    server.stdout.on("data", (chunk) => inspect(chunk, process.stdout));
    server.stderr.on("data", (chunk) => inspect(chunk, process.stderr));
    server.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`O servidor do Lighthouse encerrou antes da auditoria (código ${code}).`));
    });
  });

  return { server, ready };
}

function stopServer(server) {
  if (!server.pid || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill.exe", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }
  server.kill("SIGTERM");
}

function runLighthouse() {
  return new Promise((resolve, reject) => {
    const audit = spawn(
      process.execPath,
      [lhciEntry, "autorun", "--config=./lighthouserc.cjs"],
      { cwd: frontendDir, env: process.env, stdio: "inherit", windowsHide: true }
    );
    audit.once("error", reject);
    audit.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Lighthouse CI encerrou com código ${code}.`));
    });
  });
}

const { server, ready } = startServer();
try {
  await ready;
  await runLighthouse();
} finally {
  stopServer(server);
}
