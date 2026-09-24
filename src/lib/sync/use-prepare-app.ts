// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useState } from "react";

import { applyContentSnapshot as defaultApplyContentSnapshot } from "@/features/lessons";
import type { SnapshotResult } from "@/features/lessons";
import { importLegacyProgress as defaultImportLegacyProgress } from "@/features/migration";
import { capture, captureException } from "@/lib/analytics";
import { initDb as defaultInitDb } from "@/lib/db";
import type { AppDb } from "@/lib/db";

import { runContentSync as defaultRunContentSync } from "./content-sync";
import type { SyncTrigger } from "./content-sync";
import { migrateLegacySyncState } from "./legacy-sync-state";

export type PrepareStatus = "preparing" | "ready" | "db_error";

export type PrepareAppState = {
  status: PrepareStatus;
  snapshotApplied: boolean;
  retry: () => void;
};

export type PrepareAppDeps = {
  initDb: () => Promise<AppDb>;
  applyContentSnapshot: (db: AppDb) => Promise<SnapshotResult>;
  importLegacyProgress: () => Promise<unknown>;
  runContentSync: (trigger: SyncTrigger) => Promise<void>;
};

type Prepared = { status: "ready" | "db_error"; snapshotApplied: boolean };

async function prepare({
  initDb = defaultInitDb,
  applyContentSnapshot = defaultApplyContentSnapshot,
  importLegacyProgress = defaultImportLegacyProgress,
  runContentSync = defaultRunContentSync,
}: Partial<PrepareAppDeps>): Promise<Prepared> {
  let db: AppDb;
  try {
    db = await initDb();
  } catch (error) {
    captureException(error, { stage: "db_init" });
    return { status: "db_error", snapshotApplied: false };
  }

  let snapshotApplied = false;
  try {
    migrateLegacySyncState(db);
    const snapshot = await applyContentSnapshot(db);
    snapshotApplied = snapshot.applied;
    if (snapshot.applied) {
      capture("content_snapshot_applied", {
        snapshot_version: snapshot.snapshotVersion,
        previous_version: snapshot.previousVersion,
        read_ms: Math.round(snapshot.readMs),
        write_ms: Math.round(snapshot.writeMs),
      });
    }
  } catch (error) {
    captureException(error, { stage: "content_snapshot" });
  }

  try {
    await importLegacyProgress();
  } catch (error) {
    captureException(error, { stage: "legacy_import" });
  }

  void runContentSync("launch");
  return { status: "ready", snapshotApplied };
}

/**
 * Opens the database and fills it with the content bundled with the app,
 * everything the first screen needs. Network sync starts once it is ready.
 */
export function usePrepareApp(deps?: Partial<PrepareAppDeps>): PrepareAppState {
  const [prepared, setPrepared] = useState<Prepared | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void prepare(deps ?? {}).then((result) => {
      if (!cancelled) setPrepared(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are test-only injections, preparation reruns only on retry
  }, [attempt]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
  }, []);

  return {
    status: prepared?.status ?? "preparing",
    snapshotApplied: prepared?.snapshotApplied ?? false,
    retry,
  };
}
