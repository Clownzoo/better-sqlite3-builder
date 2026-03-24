import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

await Promise.all([
  rm(path.join(repoRoot, ".work"), { force: true, recursive: true }),
  rm(path.join(repoRoot, "dist"), { force: true, recursive: true })
]);
