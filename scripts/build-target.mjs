import { spawn } from "node:child_process";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const target = process.argv[2];
const skipSmoke = process.argv.includes("--skip-smoke");

const TARGETS = {
  "darwin-arm64": { platform: "darwin", arch: "arm64" },
  "darwin-x64": { platform: "darwin", arch: "x64" },
  "linux-x64": { platform: "linux", arch: "x64" },
  "win32-ia32": { platform: "win32", arch: "ia32" },
  "win32-x64": { platform: "win32", arch: "x64" }
};

if (!target || !TARGETS[target]) {
  console.error(`Unknown target "${target}".`);
  console.error(`Supported targets: ${Object.keys(TARGETS).join(", ")}`);
  process.exit(1);
}

const targetConfig = TARGETS[target];

if (process.platform !== targetConfig.platform) {
  console.error(
    [
      `Target ${target} must run on ${targetConfig.platform}.`,
      `Current host is ${process.platform}.`,
      targetConfig.platform === "win32"
        ? "Use the Windows CI job for this target."
        : "Use the matching host platform or the Docker wrapper."
    ].join(" ")
  );
  process.exit(1);
}

const rootPackageJson = JSON.parse(
  await readFile(path.join(repoRoot, "package.json"), "utf8")
);

const { moduleName, modulePackage, versions } = rootPackageJson.buildConfig;
const workDir = path.join(repoRoot, ".work", target);
const distDir = path.join(repoRoot, "dist", target);
const installEnv = {
  ...process.env,
  npm_config_arch: targetConfig.arch,
  npm_config_target_arch: targetConfig.arch
};
const artifactSource = path.join(
  workDir,
  "node_modules",
  modulePackage,
  "build",
  "Release",
  moduleName
);
const artifactDest = path.join(distDir, moduleName);
const smokeScriptPath = path.join(repoRoot, "scripts", "smoke-electron.cjs");

console.log(`Preparing workspace for ${target}...`);
await rm(workDir, { force: true, recursive: true });
await mkdir(workDir, { recursive: true });
await mkdir(distDir, { recursive: true });

await writeFile(
  path.join(workDir, "package.json"),
  JSON.stringify(
    {
      name: `better-sqlite3-build-${target}`,
      private: true,
      description: `Temporary build workspace for ${target}`,
      dependencies: {
        electron: versions.electron
      },
      devDependencies: {
        "@electron/rebuild": versions.electronRebuild
      }
    },
    null,
    2
  )
);

console.log(`Installing dependencies for ${target}...`);
await run("npm", ["install"], {
  cwd: workDir,
  env: installEnv
});

console.log(`Installing ${modulePackage} without running install scripts...`);
await run("npm", ["install", `${modulePackage}@${versions.betterSqlite3}`, "--ignore-scripts"], {
  cwd: workDir,
  env: installEnv
});

const installedElectronVersion = await readInstalledVersion(workDir, "electron");
const installedModuleVersion = await readInstalledVersion(workDir, modulePackage);

console.log(
  `Rebuilding ${modulePackage}@${installedModuleVersion} for Electron ${installedElectronVersion} (${target})...`
);
await run(
  "npm",
  [
    "exec",
    "electron-rebuild",
    "--",
    "-f",
    "-w",
    modulePackage,
    "-v",
    installedElectronVersion,
    "-a",
    targetConfig.arch
  ],
  {
    cwd: workDir,
    env: {
      ...installEnv,
      npm_config_build_from_source: "true",
      npm_config_devdir: path.join(workDir, ".electron-gyp"),
      npm_config_disturl: "https://electronjs.org/headers",
      npm_config_runtime: "electron",
      npm_config_target: installedElectronVersion,
    }
  }
);

if (!skipSmoke) {
  console.log(`Running Electron smoke test for ${target}...`);
  const smokeRun =
    process.platform === "darwin" && process.arch === "arm64" && targetConfig.arch === "x64"
      ? {
          command: "arch",
          args: ["-x86_64", "npm", "exec", "electron", "--", smokeScriptPath]
        }
      : {
          command: "npm",
          args: ["exec", "electron", "--", smokeScriptPath]
        };

  await run(smokeRun.command, smokeRun.args, {
    cwd: workDir,
    env: {
      ...installEnv,
      ELECTRON_RUN_AS_NODE: "1"
    }
  });
}

console.log(`Copying artifact for ${target}...`);
await copyFile(artifactSource, artifactDest);
await updateManifest({
  arch: targetConfig.arch,
  artifactPath: path.relative(repoRoot, artifactDest).replaceAll(path.sep, "/"),
  electronVersion: installedElectronVersion,
  moduleName,
  modulePackage,
  moduleVersion: installedModuleVersion,
  platform: targetConfig.platform,
  target
});

console.log(`Finished ${target}.`);

async function readInstalledVersion(workDirPath, packageName) {
  const packageJsonPath = path.join(workDirPath, "node_modules", packageName, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  return packageJson.version;
}

async function updateManifest(targetInfo) {
  const manifestPath = path.join(repoRoot, "dist", "manifest.json");
  let manifest = {
    generatedAt: new Date().toISOString(),
    moduleName,
    modulePackage,
    targets: {}
  };

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  manifest.generatedAt = new Date().toISOString();
  manifest.moduleName = moduleName;
  manifest.modulePackage = modulePackage;
  manifest.targets[targetInfo.target] = targetInfo;

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const resolvedCommand = resolveCommand(command);
    const child = spawn(
      resolvedCommand,
      args,
      buildSpawnOptions(resolvedCommand, options)
    );

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

function resolveCommand(command) {
  if (process.platform === "win32" && command === "npm") {
    return "npm.cmd";
  }

  return command;
}

function buildSpawnOptions(command, options) {
  return {
    ...options,
    shell: process.platform === "win32" && command.endsWith(".cmd"),
    stdio: "inherit",
    windowsHide: true
  };
}
