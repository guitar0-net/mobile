// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { syncAll as defaultSyncAll } from "@/features/lessons/sync";
import type { SyncProgress } from "@/features/lessons/sync";
import { initDb as defaultInitDb } from "@/lib/db";
import type { AppDb } from "@/lib/db";

import { useSyncStore } from "./store";

export type SyncStatus = "loading" | "success" | "offline" | "error";

export type AppSyncState = {
  status: SyncStatus;
  progress: SyncProgress | null;
  isFirstLaunch: boolean;
  retry: () => void;
};

export type AppSyncDeps = {
  initDb: () => Promise<AppDb>;
  syncAll: (
    db: AppDb,
    since: string | null,
    onProgress?: (progress: SyncProgress) => void,
  ) => Promise<string | null>;
};

export function useAppSync(deps?: Partial<AppSyncDeps>): AppSyncState {
  const { initDb = defaultInitDb, syncAll = defaultSyncAll } = deps ?? {};

  const { isInitialSyncDone, contentVersion, setIsInitialSyncDone, setContentVersion } =
    useSyncStore(
      useShallow((s) => ({
        isInitialSyncDone: s.isInitialSyncDone,
        contentVersion: s.contentVersion,
        setIsInitialSyncDone: s.setIsInitialSyncDone,
        setContentVersion: s.setContentVersion,
      })),
    );

  const [isFirstLaunch] = useState(() => !isInitialSyncDone);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const sync = useCallback(async () => {
    try {
      const db = await initDb();
      const onProgress = isFirstLaunch
        ? (p: SyncProgress) => setProgress(p)
        : undefined;
      const version = await syncAll(db, contentVersion || null, onProgress);
      if (version != null) setContentVersion(version);
      setIsInitialSyncDone(true);
      setStatus("success");
    } catch {
      setStatus(isFirstLaunch ? "error" : "offline");
    }
  }, [
    initDb,
    syncAll,
    contentVersion,
    isFirstLaunch,
    setContentVersion,
    setIsInitialSyncDone,
  ]);

  const retry = useCallback(() => {
    setStatus("loading");
    setProgress(null);
    void sync();
  }, [sync]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync() only sets state after its first await (initDb), so no synchronous cascading render occurs; this is the standard fetch-on-mount pattern
    void sync();
    // sync intentionally excluded: runs once on mount, retry exposes re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, progress, isFirstLaunch, retry };
}
