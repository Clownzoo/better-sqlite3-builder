import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const artifactPath = process.argv[2];

if (!artifactPath) {
  console.error("Usage: node scripts/check-linux-glibc.mjs <artifact-path>");
  process.exit(1);
}

const rootPackageJson = JSON.parse(
  await readFile(path.join(repoRoot, "package.json"), "utf8")
);
const maxAllowed =
  rootPackageJson.buildConfig?.linuxBaseline?.glibc;

if (!maxAllowed) {
  console.error("Missing buildConfig.linuxBaseline.glibc in package.json.");
  process.exit(1);
}

const output = await exec("strings", [artifactPath]);
const versions = [...output.matchAll(/\bGLIBC_(\d+(?:\.\d+)+)\b/g)]
  .map((match) => match[1])
  .filter(onlyUnique)
  .sort(compareVersions);

if (versions.length === 0) {
  console.error(`No GLIBC_* symbols found in ${artifactPath}.`);
  process.exit(1);
}

const highest = versions.at(-1);

console.log(`Detected GLIBC requirements for ${artifactPath}: ${versions.join(", ")}`);
console.log(`Maximum allowed GLIBC requirement: ${maxAllowed}`);

if (compareVersions(highest, maxAllowed) > 0) {
  console.error(
    [
      `GLIBC requirement too new: ${highest} > ${maxAllowed}.`,
      "This binary is outside the configured Linux compatibility baseline."
    ].join(" ")
  );
  process.exit(1);
}

console.log(`GLIBC requirement check passed: ${highest} <= ${maxAllowed}`);

function onlyUnique(value, index, array) {
  return array.indexOf(value) === index;
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

function exec(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            [error.message, stderr].filter(Boolean).join("\n")
          )
        );
        return;
      }

      resolve(stdout);
    });
  });
}
