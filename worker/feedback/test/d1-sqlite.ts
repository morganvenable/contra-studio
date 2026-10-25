/** A D1-shaped wrapper over node:sqlite, running the real migrations. */
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database, D1PreparedStatement } from "../src/env.ts";

const migrations = new URL("../migrations/", import.meta.url);

export type TestDb = D1Database & { raw: DatabaseSync };

export function createTestDb(): TestDb {
  const db = new DatabaseSync(":memory:");
  const files = readdirSync(migrations)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files)
    db.exec(readFileSync(new URL(file, migrations), "utf8"));
  const statement = (
    sql: string,
    values: unknown[] = [],
  ): D1PreparedStatement => {
    const args = values as SQLInputValue[];
    return {
      bind: (...next) => statement(sql, next),
      async first<T>() {
        return (db.prepare(sql).get(...args) ?? null) as T | null;
      },
      async all<T>() {
        return { results: db.prepare(sql).all(...args) as T[] };
      },
      async run() {
        return db.prepare(sql).run(...args);
      },
    };
  };
  return { raw: db, prepare: (sql) => statement(sql) };
}
