import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const targets = process.argv.slice(2);

if (targets.length === 0) {
  console.error("Usage: node scripts/run-many.mjs <target...>");
  process.exit(1);
}

for (const target of targets) {
  const isLinuxOnNonLinuxHost = target === "linux-x64" && process.platform !== "linux";
  const script = isLinuxOnNonLinuxHost ? "build-linux-docker.mjs" : "build-target.mjs";
  const args = isLinuxOnNonLinuxHost ? [] : [target];

  await run("node", [path.join(repoRoot, "scripts", script), ...args], {
    cwd: repoRoot,
    env: process.env
  });
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });

    child.on("error", reject);
  });
}
