// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

import { syncStorage } from "./storage";

type SyncData = {
  isInitialSyncDone: boolean;
  contentVersion: string;
};

type SyncActions = {
  setIsInitialSyncDone: (done: boolean) => void;
  setContentVersion: (version: string) => void;
};

export type SyncStoreState = SyncData & SyncActions;

const KEYS = {
  IS_INITIAL_SYNC_DONE: "sync.isInitialSyncDone",
  CONTENT_VERSION: "sync.contentVersion",
} as const;

// ---------------------------------------------------------------------------
// Initial data — reads synchronously from MMKV, no startup flicker.
// ---------------------------------------------------------------------------

export function readDefaults(): SyncData {
  return {
    isInitialSyncDone: syncStorage.getBoolean(KEYS.IS_INITIAL_SYNC_DONE) ?? false,
    contentVersion: syncStorage.getString(KEYS.CONTENT_VERSION) ?? "",
  };
}

export const useSyncStore = create<SyncStoreState>((set) => ({
  ...readDefaults(),

  setIsInitialSyncDone: (isInitialSyncDone) => {
    syncStorage.set(KEYS.IS_INITIAL_SYNC_DONE, isInitialSyncDone);
    set({ isInitialSyncDone });
  },

  setContentVersion: (contentVersion) => {
    syncStorage.set(KEYS.CONTENT_VERSION, contentVersion);
    set({ contentVersion });
  },
}));
