const path = require("node:path");
const { createRequire } = require("node:module");

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
const Database = requireFromCwd("better-sqlite3");

const db = new Database(":memory:");
const row = db.prepare("SELECT 1 AS value").get();
db.close();

if (!row || row.value !== 1) {
  throw new Error("Smoke test failed: SELECT 1 did not return 1");
}

console.log("Smoke test passed.");
