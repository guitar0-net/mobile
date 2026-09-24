// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  invalidateContentQueries as defaultInvalidateContentQueries,
  startSchemeImageSync as defaultStartSchemeImageSync,
  syncAll as defaultSyncAll,
} from "@/features/lessons";
import type { SyncResult } from "@/features/lessons";
import { capture, captureException } from "@/lib/analytics";
import { getDb as defaultGetDb } from "@/lib/db";
import type { AppDb } from "@/lib/db";

import { describeSyncFailure } from "./failure";
import { useSyncStore } from "./store";

export type SyncTrigger = "launch" | "foreground" | "network" | "manual";

export type ContentSyncDeps = {
  getDb: () => AppDb;
  syncAll: (db: AppDb) => Promise<SyncResult>;
  invalidateContentQueries: () => void;
  startSchemeImageSync: () => Promise<void>;
};

let activeSync: Promise<void> | null = null;

/**
 * Pulls content changes from the server in the background. Failures only
 * update `syncStatus` — the app keeps working from the local database.
 * Calling it while a sync is running returns that sync instead of starting another.
 */
export function runContentSync(
  trigger: SyncTrigger,
  deps?: Partial<ContentSyncDeps>,
): Promise<void> {
  activeSync ??= syncContent(trigger, deps ?? {}).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

async function syncContent(
  trigger: SyncTrigger,
  {
    getDb = defaultGetDb,
    syncAll = defaultSyncAll,
    invalidateContentQueries = defaultInvalidateContentQueries,
    startSchemeImageSync = defaultStartSchemeImageSync,
  }: Partial<ContentSyncDeps>,
): Promise<void> {
  const startedAt = Date.now();
  useSyncStore.setState({ syncStatus: "syncing" });
  try {
    const { previousVersion, version } = await syncAll(getDb());
    useSyncStore.getState().setLastSyncedAt(Date.now());
    useSyncStore.setState({ syncStatus: "idle", lastFailure: null });
    invalidateContentQueries();
    if (version !== previousVersion) {
      capture("content_sync_completed", {
        trigger,
        previous_version: previousVersion,
        version,
        duration_ms: Date.now() - startedAt,
      });
    }
    void startSchemeImageSync();
  } catch (error) {
    if (__DEV__) console.warn("[sync] failed:", error);
    const failure = describeSyncFailure(error);
    useSyncStore.setState({ syncStatus: "failed", lastFailure: failure });
    const details = {
      trigger,
      kind: failure.kind,
      error_name: error instanceof Error ? error.name : typeof error,
      duration_ms: Date.now() - startedAt,
    };
    capture("content_sync_failed", details);
    if (failure.kind !== "offline") {
      captureException(error, { stage: "content_sync", ...details });
    }
  }
}
