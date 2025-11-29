#!/usr/bin/env node
import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";
const dockerCmd = isWindows ? "docker.exe" : "docker";

function runCommand(title, command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: false,
      ...options
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${title} failed with exit code ${code}`));
      }
    });
  });
}

function startService(name, command, args) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: false
  });

  const log = (data, stream) => {
    process.stdout.write(`[${name}:${stream}] ${data}`);
  };

  child.stdout.on("data", (chunk) => log(chunk, "out"));
  child.stderr.on("data", (chunk) => log(chunk, "err"));

  child.on("close", (code) => {
    console.log(`[${name}] exited with code ${code}`);
  });

  return () => {
    child.kill("SIGINT");
  };
}

async function main() {
  console.log("🚀 IndexFlow Getting Started");

  await runCommand("Docker compose (db)", dockerCmd, ["compose", "up", "-d", "db"], {
    cwd: process.cwd()
  });

  await runCommand(
    "Prisma migrate deploy",
    npmCmd,
    ["run", "prisma:deploy", "--workspace", "index-node"],
    { cwd: process.cwd() }
  );

  await runCommand("Database seed", npmCmd, ["run", "db:seed", "--workspace", "index-node"], {
    cwd: process.cwd()
  });

  console.log("✅ Database ready. Booting services (contracts, index-node, frontend)...");

  const stopContracts = startService("contracts", npmCmd, [
    "run",
    "dev",
    "--workspace",
    "contracts"
  ]);
  const stopIndexNode = startService("index-node", npmCmd, [
    "run",
    "dev",
    "--workspace",
    "index-node"
  ]);
  const stopFrontend = startService("frontend", npmCmd, [
    "run",
    "dev",
    "--workspace",
    "frontend"
  ]);

  const shutdown = () => {
    console.log("\nShutting down services...");
    stopContracts();
    stopIndexNode();
    stopFrontend();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("All services are running. Press Ctrl+C to stop.");
}

main().catch((error) => {
  console.error("[getting-started] failed:", error.message);
  process.exit(1);
});
