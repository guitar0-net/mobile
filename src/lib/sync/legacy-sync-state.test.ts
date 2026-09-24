// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { adoptContentVersion, getContentVersion } from "@/features/lessons";
import { resetDbForTesting } from "@/features/lessons/__tests__/testing";
import { initDb } from "@/lib/db";

import { resetSyncForTesting } from "./__tests__/testing";
import { migrateLegacySyncState } from "./legacy-sync-state";
import { syncStorage } from "./storage";

beforeEach(() => {
  resetDbForTesting();
  resetSyncForTesting();
});

test("adopts the version an earlier build kept in storage and forgets the old keys", async () => {
  const db = await initDb();
  syncStorage.set("sync.contentVersion", "2026-08-01T00:00:00+00:00");
  syncStorage.set("sync.isInitialSyncDone", true);

  migrateLegacySyncState(db);

  expect(getContentVersion(db)).toBe("2026-08-01T00:00:00+00:00");
  expect(syncStorage.getAllKeys()).toEqual([]);
});

test("keeps a version the database already has", async () => {
  const db = await initDb();
  adoptContentVersion(db, "2026-09-01T00:00:00+00:00");
  syncStorage.set("sync.contentVersion", "2026-08-01T00:00:00+00:00");

  migrateLegacySyncState(db);

  expect(getContentVersion(db)).toBe("2026-09-01T00:00:00+00:00");
});

test("a fresh install stays without a version", async () => {
  const db = await initDb();

  migrateLegacySyncState(db);

  expect(getContentVersion(db)).toBeNull();
});
