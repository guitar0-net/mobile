// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

import type { SyncFailure } from "./failure";
import { syncStorage } from "./storage";

export type SyncStatus = "idle" | "syncing" | "failed";

type SyncData = {
  lastSyncedAt: number | null;
  syncStatus: SyncStatus;
  lastFailure: SyncFailure | null;
};

type SyncActions = {
  setLastSyncedAt: (timestamp: number) => void;
};

export type SyncStoreState = SyncData & SyncActions;

const KEYS = {
  LAST_SYNCED_AT: "sync.lastSyncedAt",
} as const;

// ---------------------------------------------------------------------------
// Initial data — reads synchronously from MMKV, no startup flicker.
// ---------------------------------------------------------------------------

export function readDefaults(): SyncData {
  return {
    lastSyncedAt: syncStorage.getNumber(KEYS.LAST_SYNCED_AT) ?? null,
    syncStatus: "idle",
    lastFailure: null,
  };
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...readDefaults(),

  setLastSyncedAt: (lastSyncedAt) => {
    syncStorage.set(KEYS.LAST_SYNCED_AT, lastSyncedAt);
    set({ lastSyncedAt });
  },
}));
