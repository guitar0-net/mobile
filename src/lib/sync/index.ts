// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useShallow } from "zustand/react/shallow";

import { useSyncStore } from "./store";

export { useSyncStore } from "./store";
export type { SyncStoreState } from "./store";
export type { SyncFailure, SyncFailureKind } from "./failure";
export { useAppSync } from "./use-app-sync";
export type { AppSyncDeps, AppSyncState, SyncStatus } from "./use-app-sync";
export { useSchemeImageRetry } from "./use-scheme-image-retry";
export { runContentSync } from "./content-sync";
export type { ContentSyncDeps, SyncTrigger } from "./content-sync";
export { useBackgroundSync } from "./use-background-sync";
export type { BackgroundSyncDeps } from "./use-background-sync";
export { usePrepareApp } from "./use-prepare-app";
export type { PrepareAppDeps, PrepareAppState, PrepareStatus } from "./use-prepare-app";

export function useSyncState() {
  return useSyncStore(
    useShallow((s) => ({
      isInitialSyncDone: s.isInitialSyncDone,
      contentVersion: s.contentVersion,
      lastSyncedAt: s.lastSyncedAt,
      setIsInitialSyncDone: s.setIsInitialSyncDone,
      setContentVersion: s.setContentVersion,
      setLastSyncedAt: s.setLastSyncedAt,
    })),
  );
}
