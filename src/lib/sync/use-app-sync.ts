// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { startSchemeImageSync as defaultStartSchemeImageSync } from "@/features/lessons/scheme-images";
import { syncAll as defaultSyncAll } from "@/features/lessons/sync";
import { capture, captureException } from "@/lib/analytics";
import { initDb as defaultInitDb } from "@/lib/db";
import type { AppDb } from "@/lib/db";

import { describeSyncFailure } from "./failure";
import type { SyncFailure } from "./failure";
import { useSyncStore } from "./store";

/** "stale" — sync failed but local content is usable; "error" — nothing to fall back on. */
export type SyncStatus = "loading" | "success" | "stale" | "error";

type SyncProgress = { stage: "fetching"; bytes: number } | { stage: "saving" };

export type AppSyncState = {
  status: SyncStatus;
  failure: SyncFailure | null;
  progress: SyncProgress | null;
  isFirstLaunch: boolean;
  retry: () => void;
};

export type AppSyncDeps = {
  initDb: () => Promise<AppDb>;
  syncAll: (
    db: AppDb,
    since: string | null,
    onProgress?: (progress: SyncProgress) => void | Promise<void>,
  ) => Promise<string | null>;
  startSchemeImageSync: () => Promise<void>;
};

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

export function useAppSync(deps?: Partial<AppSyncDeps>): AppSyncState {
  const {
    initDb = defaultInitDb,
    syncAll = (db: AppDb) => defaultSyncAll(db).then(({ version }) => version),
    startSchemeImageSync = defaultStartSchemeImageSync,
  } = deps ?? {};

  const {
    isInitialSyncDone,
    contentVersion,
    setIsInitialSyncDone,
    setContentVersion,
    setLastSyncedAt,
  } = useSyncStore(
    useShallow((s) => ({
      isInitialSyncDone: s.isInitialSyncDone,
      contentVersion: s.contentVersion,
      setIsInitialSyncDone: s.setIsInitialSyncDone,
      setContentVersion: s.setContentVersion,
      setLastSyncedAt: s.setLastSyncedAt,
    })),
  );

  const [isFirstLaunch] = useState(() => !isInitialSyncDone);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [failure, setFailure] = useState<SyncFailure | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const sync = useCallback(async () => {
    const startedAt = Date.now();
    let step: "init" | "fetching" | SyncProgress["stage"] = "init";
    try {
      const db = await initDb();
      step = "fetching";
      const onProgress = (p: SyncProgress) => {
        step = p.stage;
        if (!isFirstLaunch) return;
        setProgress(p);
        return p.stage === "saving" ? waitForPaint() : undefined;
      };
      const version = await syncAll(db, contentVersion || null, onProgress);
      if (version != null) setContentVersion(version);
      setIsInitialSyncDone(true);
      setLastSyncedAt(Date.now());
      setFailure(null);
      setStatus("success");
      void startSchemeImageSync();
      if (isFirstLaunch) {
        capture("initial_sync_completed", { duration_ms: Date.now() - startedAt });
      }
    } catch (error) {
      if (__DEV__) console.warn("[sync] failed:", error);
      const syncFailure = describeSyncFailure(error);
      setFailure(syncFailure);
      setStatus(isFirstLaunch ? "error" : "stale");
      const details = {
        kind: syncFailure.kind,
        is_first_launch: isFirstLaunch,
        error_name: error instanceof Error ? error.name : typeof error,
        duration_ms: Date.now() - startedAt,
        sync_step: step,
      };
      capture("content_sync_failed", { ...details, trigger: "launch" });
      if (isFirstLaunch || syncFailure.kind !== "offline") {
        captureException(error, { stage: "content_sync", ...details });
      }
    }
  }, [
    initDb,
    syncAll,
    startSchemeImageSync,
    contentVersion,
    isFirstLaunch,
    setContentVersion,
    setIsInitialSyncDone,
    setLastSyncedAt,
  ]);

  const retry = useCallback(() => {
    setStatus("loading");
    setFailure(null);
    setProgress(null);
    void sync();
  }, [sync]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync() only sets state after its first await (initDb), so no synchronous cascading render occurs; this is the standard fetch-on-mount pattern
    void sync();
    // sync intentionally excluded: runs once on mount, retry exposes re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, failure, progress, isFirstLaunch, retry };
}
