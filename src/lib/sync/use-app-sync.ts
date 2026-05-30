// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { initDb as defaultInitDb } from "@/lib/lessons/db";
import type { LessonsDb } from "@/lib/lessons/db";
import { syncAll as defaultSyncAll } from "@/lib/lessons/sync";
import type { SyncProgress } from "@/lib/lessons/sync";

import { useSyncStore } from "./store";

export type SyncStatus = "loading" | "success" | "offline" | "error";

export type AppSyncState = {
  status: SyncStatus;
  progress: SyncProgress | null;
  isFirstLaunch: boolean;
  retry: () => void;
};

export type AppSyncDeps = {
  initDb: () => Promise<LessonsDb>;
  syncAll: (
    db: LessonsDb,
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

  const isFirstLaunch = useRef(!isInitialSyncDone).current;
  const [status, setStatus] = useState<SyncStatus>("loading");
  const [progress, setProgress] = useState<SyncProgress | null>(null);

  const run = useCallback(async () => {
    setStatus("loading");
    setProgress(null);
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

  useEffect(() => {
    void run();
    // run intentionally excluded: sync runs once on mount, retry exposes re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, progress, isFirstLaunch, retry: run };
}
