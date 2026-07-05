// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { initDb } from "@/lib/db";

import { getDeviceId } from "./device-id";
import { localDayKey } from "./logic";
import { recordSession } from "./session-recorder";
import { useActivityStatsStore } from "./stats-store";

const BACKGROUNDED_STATES = new Set<AppStateStatus>(["background", "inactive"]);

export function useAppSession(): void {
  const queryClient = useQueryClient();
  const sessionStartRef = useRef<Date | null>(
    AppState.currentState === "active" ? new Date() : null,
  );

  useEffect(() => {
    // Credit today's streak as soon as a session starts, not only once it ends —
    // otherwise the streak still reads as yesterday's until the user backgrounds
    // the app, even though they're already using it.
    if (sessionStartRef.current) {
      useActivityStatsStore
        .getState()
        .advanceStreakForDay(localDayKey(sessionStartRef.current));
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        const startedAt = new Date();
        sessionStartRef.current = startedAt;
        useActivityStatsStore.getState().advanceStreakForDay(localDayKey(startedAt));
        return;
      }

      if (!BACKGROUNDED_STATES.has(nextState)) return;

      const startedAt = sessionStartRef.current;
      if (!startedAt) return;
      sessionStartRef.current = null;

      const endedAt = new Date();
      const deviceId = getDeviceId();

      void (async () => {
        const db = await initDb();
        const chunks = await recordSession(db, deviceId, startedAt, endedAt);
        for (const chunk of chunks) {
          void queryClient.invalidateQueries({
            queryKey: ["activity", "dailyTotal", chunk.date],
          });
        }
        if (chunks.length > 0) {
          void queryClient.invalidateQueries({ queryKey: ["activity", "history"] });
        }
      })();
    });

    return () => subscription.remove();
  }, [queryClient]);
}
