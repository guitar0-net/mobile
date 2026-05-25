// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Jest mock for expo-sqlite.
 *
 * Wraps better-sqlite3 (an in-memory, pure-Node SQLite binding) in exactly the
 * synchronous API shape that drizzle-orm/expo-sqlite uses:
 *
 *   database.prepareSync(sql)   → stmt
 *   stmt.executeSync(params)    → { changes, lastInsertRowId, getAllSync(), getFirstSync() }
 *   stmt.executeForRawResultSync(params) → { getAllSync() }
 *   stmt.finalizeSync()
 *   database.execSync(sql)
 *
 * Each openDatabaseSync() call gets its own in-memory database so tests are
 * isolated. Foreign key enforcement is enabled on every connection so that
 * FK constraint violations surface in tests just as they would on-device.
 */

const Database = require("better-sqlite3");

function createStatement(nativeStmt) {
  return {
    executeSync(params) {
      const args = Array.isArray(params) ? params : params == null ? [] : [params];
      // Let better-sqlite3 run the statement and surface any constraint errors.
      // run() works for both DML (returns { changes, lastInsertRowid }) and
      // SELECT (returns the same struct with 0 changes); all/get are then used
      // by the callers of getAllSync/getFirstSync to actually read rows.
      const info = nativeStmt.run(...args);

      return {
        changes: info.changes ?? 0,
        lastInsertRowId: info.lastInsertRowid ?? 0,
        getAllSync() {
          return nativeStmt.all(...args);
        },
        getFirstSync() {
          return nativeStmt.get(...args) ?? null;
        },
        // Iterator protocol (not used by drizzle but avoids crashes)
        [Symbol.iterator]() {
          const rows = nativeStmt.all(...args);
          return rows[Symbol.iterator]();
        },
      };
    },

    executeForRawResultSync(params) {
      const args = Array.isArray(params) ? params : params == null ? [] : [params];
      // Return rows as value arrays (not objects). Toggle raw mode only for
      // the duration of the read to avoid mutating the statement for later use.
      return {
        getAllSync() {
          nativeStmt.raw(true);
          try {
            return nativeStmt.all(...args);
          } finally {
            nativeStmt.raw(false);
          }
        },
        getFirstSync() {
          nativeStmt.raw(true);
          try {
            return nativeStmt.get(...args) ?? null;
          } finally {
            nativeStmt.raw(false);
          }
        },
      };
    },

    finalizeSync() {
      // better-sqlite3 doesn't need explicit finalization
    },
  };
}

function createSQLiteDatabase(bsDb) {
  return {
    prepareSync(sql) {
      const stmt = bsDb.prepare(sql);
      return createStatement(stmt);
    },

    execSync(source) {
      bsDb.exec(source);
    },
  };
}

function openDatabaseSync(_name, _options) {
  const bsDb = new Database(":memory:");
  // Mirror the PRAGMA foreign_keys = ON that db.ts sets on every production
  // connection so FK violations are caught in tests too.
  bsDb.pragma("foreign_keys = ON");
  return createSQLiteDatabase(bsDb);
}

module.exports = {
  openDatabaseSync,
  SQLiteDatabase: class {},
};
