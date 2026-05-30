// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useShallow } from "zustand/react/shallow";

import { useSyncStore } from "./store";

export { useSyncStore } from "./store";
export type { SyncStoreState } from "./store";
export { useAppSync } from "./use-app-sync";
export type { AppSyncDeps, AppSyncState, SyncStatus } from "./use-app-sync";

export function useSyncState() {
  return useSyncStore(
    useShallow((s) => ({
      isInitialSyncDone: s.isInitialSyncDone,
      contentVersion: s.contentVersion,
      setIsInitialSyncDone: s.setIsInitialSyncDone,
      setContentVersion: s.setContentVersion,
    })),
  );
}
