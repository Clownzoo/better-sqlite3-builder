const assert = require("node:assert/strict");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { createRequire } = require("node:module");

const requireFromCwd = createRequire(path.join(process.cwd(), "package.json"));
const Database = requireFromCwd("better-sqlite3");
const moduleVersion = requireFromCwd("better-sqlite3/package.json").version;
const [electronVersion, expectedModuleVersion, arch] = process.argv.slice(2);

assert.ok(process.versions.electron, "Smoke test must run in Electron");
assert.equal(process.versions.electron, electronVersion);
assert.equal(moduleVersion, expectedModuleVersion);
assert.equal(process.arch, arch);

const directory = mkdtempSync(path.join(tmpdir(), "better-sqlite3-smoke-"));
const databasePath = path.join(directory, "test.sqlite");
let db;
try {
  db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  assert.equal(db.pragma("journal_mode = WAL", { simple: true }), "wal");
  db.exec("CREATE TABLE records (id INTEGER PRIMARY KEY, value TEXT NOT NULL, payload BLOB)");
  const payload = Buffer.from([0, 127, 255]);
  const insert = db.prepare("INSERT INTO records (id, value, payload) VALUES (?, ?, ?)");
  db.transaction(() => insert.run(1, "持久化验证", payload))();
  assert.throws(db.transaction(() => {
    insert.run(2, "rollback", payload);
    throw new Error("rollback sentinel");
  }), /rollback sentinel/);
  assert.equal(db.prepare("SELECT count(*) AS count FROM records").get().count, 1);
  db.close();

  db = new Database(databasePath);
  assert.deepEqual(db.prepare("SELECT * FROM records ORDER BY id").all(), [
    { id: 1, value: "持久化验证", payload }
  ]);
  console.log(JSON.stringify({
    electron: process.versions.electron,
    node: process.versions.node,
    abi: process.versions.modules,
    platform: process.platform,
    arch: process.arch,
    betterSqlite3: moduleVersion,
    sqlite: db.prepare("SELECT sqlite_version() AS version").get().version
  }));
  console.log("Smoke test passed: WAL, transactions, rollback, BLOB and reopen persistence.");
} finally {
  if (db?.open) db.close();
  rmSync(directory, { recursive: true, force: true });
}
