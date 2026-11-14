// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { syncStorage } from "./storage";

const LEGACY_KEYS = {
  CONTENT_VERSION: "sync.contentVersion",
  IS_INITIAL_SYNC_DONE: "sync.isInitialSyncDone",
} as const;

/** Forgets the sync state that earlier builds kept in storage. */
export function clearLegacySyncState(): void {
  syncStorage.remove(LEGACY_KEYS.CONTENT_VERSION);
  syncStorage.remove(LEGACY_KEYS.IS_INITIAL_SYNC_DONE);
}
