import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const imageTag = "better-sqlite3-electron-builder-linux-x64";
const dockerPlatform = "linux/amd64";
const dockerHome = "/workspace/.work/docker-home";
const dockerCache = `${dockerHome}/.npm`;
const dockerXdgCache = `${dockerHome}/.cache`;

await mkdir(path.join(repoRoot, ".work", "docker-home"), { recursive: true });

console.log("Building Linux x64 Docker image...");
await run(
  "docker",
  [
    "build",
    "--platform",
    dockerPlatform,
    "-t",
    imageTag,
    "-f",
    path.join(repoRoot, "docker", "linux-x64.Dockerfile"),
    "."
  ],
  {
    cwd: repoRoot,
    env: process.env
  }
);

const dockerArgs = [
  "run",
  "--rm",
  "--platform",
  dockerPlatform,
  "-v",
  `${repoRoot}:/workspace`,
  "-w",
  "/workspace",
  "-e",
  `HOME=${dockerHome}`,
  "-e",
  `npm_config_cache=${dockerCache}`,
  "-e",
  `XDG_CACHE_HOME=${dockerXdgCache}`
];

if (typeof process.getuid === "function" && typeof process.getgid === "function") {
  dockerArgs.push("-u", `${process.getuid()}:${process.getgid()}`);
}

dockerArgs.push(imageTag, "node", "scripts/build-target.mjs", "linux-x64");

console.log("Running Linux x64 build inside Docker...");
await run("docker", dockerArgs, {
  cwd: repoRoot,
  env: process.env
});

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
