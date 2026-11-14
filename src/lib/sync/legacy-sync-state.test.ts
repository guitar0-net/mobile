// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getContentVersion } from "@/features/lessons";
import { resetDbForTesting } from "@/features/lessons/__tests__/testing";
import { initDb } from "@/lib/db";

import { resetSyncForTesting } from "./__tests__/testing";
import { clearLegacySyncState } from "./legacy-sync-state";
import { syncStorage } from "./storage";

beforeEach(() => {
  resetDbForTesting();
  resetSyncForTesting();
});

test("forgets the version an earlier build kept in storage instead of adopting it", async () => {
  const db = await initDb();
  syncStorage.set("sync.contentVersion", "2026-11-14T08:00:00+00:00");
  syncStorage.set("sync.isInitialSyncDone", true);

  clearLegacySyncState();

  expect(getContentVersion(db)).toBeNull();
  expect(syncStorage.getAllKeys()).toEqual([]);
});
