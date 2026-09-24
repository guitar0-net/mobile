// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { adoptContentVersion } from "@/features/lessons";
import type { AppDb } from "@/lib/db";

import { syncStorage } from "./storage";

const LEGACY_KEYS = {
  CONTENT_VERSION: "sync.contentVersion",
  IS_INITIAL_SYNC_DONE: "sync.isInitialSyncDone",
} as const;

/**
 * Moves the content version that earlier builds kept in storage into the
 * database, so the bundled snapshot does not replace newer synced content.
 */
export function migrateLegacySyncState(db: AppDb): void {
  const version = syncStorage.getString(LEGACY_KEYS.CONTENT_VERSION);
  if (version) adoptContentVersion(db, version);
  syncStorage.remove(LEGACY_KEYS.CONTENT_VERSION);
  syncStorage.remove(LEGACY_KEYS.IS_INITIAL_SYNC_DONE);
}
