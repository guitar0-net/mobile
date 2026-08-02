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

// iOS fires "inactive" for brief system overlays (Control Center, an incoming
// call banner, a permission sheet) that resolve back to "active" within a
// second or two. Ending the session on every one of those would fragment a
// single sitting into many tiny rows, so "inactive" only ends the session if
// it isn't followed by "active" within this window. "background" is always
// a real exit and ends the session immediately.
const DEFAULT_INACTIVE_GRACE_MS = 8_000;

// Flushes accrued time to SQLite periodically instead of only at session end,
// so a crash or force-quit mid-session loses at most one interval's worth of
// time instead of the whole session, and daily totals/streak update live
// while the app stays open.
const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;

export type UseAppSessionOptions = {
  inactiveGraceMs?: number;
  heartbeatIntervalMs?: number;
};

export function useAppSession({
  inactiveGraceMs = DEFAULT_INACTIVE_GRACE_MS,
  heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
}: UseAppSessionOptions = {}): void {
  const queryClient = useQueryClient();
  const sessionStartRef = useRef<Date | null>(
    AppState.currentState === "active" ? new Date() : null,
  );
  const inactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const clearInactiveTimer = () => {
      if (!inactiveTimerRef.current) return;
      clearTimeout(inactiveTimerRef.current);
      inactiveTimerRef.current = null;
    };

    const stopHeartbeat = () => {
      if (!heartbeatTimerRef.current) return;
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    };

    // endedAt: when the session's accrued time ends. keepGoing: true for a
    // heartbeat tick (session continues, endedAt becomes the new start),
    // false for a real session end (background, or an inactive blip that
    // never returned to active).
    const flush = (endedAt: Date, keepGoing: boolean) => {
      const startedAt = sessionStartRef.current;
      if (!startedAt) return;
      sessionStartRef.current = keepGoing ? endedAt : null;

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
          void queryClient.invalidateQueries({ queryKey: ["activity", "totalTime"] });
        }
      })();
    };

    const startHeartbeat = () => {
      stopHeartbeat();
      heartbeatTimerRef.current = setInterval(() => {
        flush(new Date(), true);
      }, heartbeatIntervalMs);
    };

    const startSession = (startedAt: Date) => {
      sessionStartRef.current = startedAt;
      useActivityStatsStore.getState().advanceStreakForDay(localDayKey(startedAt));
      startHeartbeat();
    };

    const endSession = (endedAt: Date) => {
      clearInactiveTimer();
      stopHeartbeat();
      flush(endedAt, false);
    };

    // Credit today's streak as soon as a session starts, not only once it ends —
    // otherwise the streak still reads as yesterday's until the user backgrounds
    // the app, even though they're already using it.
    if (sessionStartRef.current) {
      useActivityStatsStore
        .getState()
        .advanceStreakForDay(localDayKey(sessionStartRef.current));
      startHeartbeat();
    }

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          clearInactiveTimer();
          if (sessionStartRef.current) return; // resumed from an inactive blip, session never ended
          startSession(new Date());
          return;
        }

        if (nextState === "background") {
          if (!sessionStartRef.current) return;
          endSession(new Date());
          return;
        }

        if (nextState === "inactive") {
          if (!sessionStartRef.current || inactiveTimerRef.current) return;
          inactiveTimerRef.current = setTimeout(() => {
            inactiveTimerRef.current = null;
            endSession(new Date());
          }, inactiveGraceMs);
        }
      },
    );

    return () => {
      subscription.remove();
      clearInactiveTimer();
      stopHeartbeat();
    };
  }, [queryClient, inactiveGraceMs, heartbeatIntervalMs]);
}
