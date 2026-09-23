// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { addNetworkStateListener } from "expo-network";
import { useEffect } from "react";
import { AppState } from "react-native";

import { resumeSchemeImageSync as defaultResumeSchemeImageSync } from "@/features/lessons/scheme-images";

import { useSyncStore } from "./store";

export type SchemeImageRetryDeps = {
  resumeSchemeImageSync: () => Promise<void>;
};

/**
 * Retries missing scheme images when the app returns to the foreground or the
 * internet becomes reachable. Mount it once, at the app root.
 */
export function useSchemeImageRetry(deps?: Partial<SchemeImageRetryDeps>): void {
  const { resumeSchemeImageSync = defaultResumeSchemeImageSync } = deps ?? {};

  useEffect(() => {
    const retry = () => {
      if (useSyncStore.getState().isInitialSyncDone) void resumeSchemeImageSync();
    };
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") retry();
    });
    const network = addNetworkStateListener(({ isInternetReachable }) => {
      if (isInternetReachable) retry();
    });
    return () => {
      appState.remove();
      network.remove();
    };
  }, [resumeSchemeImageSync]);
}
