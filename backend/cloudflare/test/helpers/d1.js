// A D1 stand-in on node:sqlite (API_CONTRACT_V3 §11.6): prepare/bind/first/all/run/batch
// with meta.changes, plus the numbered migrations applied in order.
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS_DIR = new URL("../../migrations/", import.meta.url);

// D1 binds booleans as 1/0 and rejects undefined.
const toSqlite = (value) => {
  if (value === undefined) throw new TypeError("D1_TYPE_ERROR: Type 'undefined' not supported");
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
};

const plain = (row) => (row ? { ...row } : null);

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new Statement(this.db, this.sql, params.map(toSqlite));
  }

  runSync() {
    const result = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }

  async first(column) {
    const row = plain(this.db.prepare(this.sql).get(...this.params));
    if (!row) return null;
    return column ? row[column] : row;
  }

  async all() {
    const results = this.db.prepare(this.sql).all(...this.params).map(plain);
    return { success: true, results, meta: { changes: 0 } };
  }

  async run() {
    return this.runSync();
  }
}

export class D1Stub {
  constructor() {
    this.db = new DatabaseSync(":memory:");
  }

  prepare(sql) {
    return new Statement(this.db, sql);
  }

  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = statements.map((statement) => statement.runSync());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async exec(sql) {
    this.db.exec(sql);
    return { count: 1 };
  }
}

export const migrationFiles = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();

/** Applies migrations whose number is <= `upTo` (default: all), each in a transaction like wrangler. */
export const applyMigrations = (d1, { upTo = Infinity } = {}) => {
  for (const name of migrationFiles()) {
    if (Number(name.slice(0, 4)) > upTo) continue;
    const sql = readFileSync(new URL(name, MIGRATIONS_DIR), "utf8");
    d1.db.exec("BEGIN");
    try {
      d1.db.exec(sql);
      d1.db.exec("COMMIT");
    } catch (error) {
      d1.db.exec("ROLLBACK");
      throw new Error(`${name}: ${error.message}`, { cause: error });
    }
  }
  return d1;
};

export const createD1 = (options) => applyMigrations(new D1Stub(), options);
