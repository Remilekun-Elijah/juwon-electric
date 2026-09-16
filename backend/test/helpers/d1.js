// Minimal Cloudflare D1 stand-in on node:sqlite for Worker tests. Applies every
// migration in backend/cloudflare/migrations in order. batch() is transactional like D1.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../cloudflare/migrations");

const toSqlite = (value) => {
  if (value === undefined) throw new TypeError("D1_TYPE_ERROR: Type 'undefined' not supported for value 'undefined'");
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
};

class Statement {
  constructor(db, sql, params = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params) {
    return new Statement(this.db, this.sql, params.map(toSqlite));
  }

  prepared() {
    return this.db.prepare(this.sql);
  }

  runSync() {
    const statement = this.prepared();
    if (/\breturning\b/i.test(this.sql)) {
      const results = statement.all(...this.params);
      return { success: true, results, meta: { changes: results.length } };
    }
    const result = statement.run(...this.params);
    return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }

  async first(column) {
    const row = this.prepared().get(...this.params);
    if (!row) return null;
    const plain = { ...row };
    return column ? plain[column] : plain;
  }

  async all() {
    return { success: true, results: this.prepared().all(...this.params).map((row) => ({ ...row })), meta: {} };
  }

  async run() {
    return this.runSync();
  }
}

export const createD1 = () => {
  const db = new DatabaseSync(":memory:");
  for (const file of readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return {
    raw: db,
    prepare: (sql) => new Statement(db, sql),
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const results = statements.map((statement) => statement.runSync());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    async exec(sql) {
      db.exec(sql);
      return { count: 1 };
    },
  };
};
