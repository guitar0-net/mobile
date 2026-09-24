// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { addNetworkStateListener } from "expo-network";
import { useEffect } from "react";
import { AppState } from "react-native";

import { resumeSchemeImageSync as defaultResumeSchemeImageSync } from "@/features/lessons/scheme-images";

import { runContentSync as defaultRunContentSync } from "./content-sync";
import type { SyncTrigger } from "./content-sync";
import { useSyncStore } from "./store";

export type BackgroundSyncDeps = {
  runContentSync: (trigger: SyncTrigger) => Promise<void>;
  resumeSchemeImageSync: () => Promise<void>;
};

/**
 * When the app returns to the foreground or the internet becomes reachable,
 * retries a failed content sync, or else resumes missing scheme images.
 * Mount it once, at the app root, after the database is ready.
 */
export function useBackgroundSync(deps?: Partial<BackgroundSyncDeps>): void {
  const {
    runContentSync = defaultRunContentSync,
    resumeSchemeImageSync = defaultResumeSchemeImageSync,
  } = deps ?? {};

  useEffect(() => {
    const catchUp = (trigger: "foreground" | "network") => {
      if (useSyncStore.getState().syncStatus === "failed") void runContentSync(trigger);
      else void resumeSchemeImageSync();
    };
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") catchUp("foreground");
    });
    const network = addNetworkStateListener(({ isInternetReachable }) => {
      if (isInternetReachable) catchUp("network");
    });
    return () => {
      appState.remove();
      network.remove();
    };
  }, [runContentSync, resumeSchemeImageSync]);
}
