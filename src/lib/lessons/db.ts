// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";
import migrations from "../../../drizzle/migrations";

export type LessonsDb = ReturnType<typeof drizzle<typeof schema>>;

let db: LessonsDb | null = null;

function openDb(): LessonsDb {
  if (!db) {
    const sqlite = openDatabaseSync("lessons.db");
    // SQLite does not enforce foreign keys by default; enable per-connection.
    sqlite.execSync("PRAGMA foreign_keys = ON;");
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export async function initDb(): Promise<LessonsDb> {
  const database = openDb();
  await migrate(database, migrations);
  return database;
}

export function getDb(): LessonsDb {
  if (!db) {
    throw new Error("Database not initialised — call initDb() before getDb()");
  }
  return db;
}

export function _resetDbForTesting(): void {
  db = null;
}
