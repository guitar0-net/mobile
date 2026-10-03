// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";

import { _resetDbForTesting, activityEvents, initDb } from "@/lib/db";
import { createTestQueryClient } from "@/lib/network/__tests__/testing";

import { resetActivityStatsForTesting } from "./__tests__/testing";
import { useActivityStatsStore } from "./stats-store";
import { useAppSession } from "./use-app-session";

function makeWrapper() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
}

type Listener = (state: AppStateStatus) => void;

function setAppState(state: AppStateStatus): void {
  Object.defineProperty(AppState, "currentState", { value: state, configurable: true });
}

function captureAppStateListener(): () => Listener {
  let listener: Listener = () => {};
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, cb) => {
    listener = cb as Listener;
    return { remove: jest.fn() };
  });
  return () => listener;
}

beforeEach(() => {
  _resetDbForTesting();
  resetActivityStatsForTesting();
  jest.restoreAllMocks();
  jest.useFakeTimers({
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "nextTick",
    ],
  });
  jest.setSystemTime(new Date("2026-01-05T10:00:00"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useAppSession", () => {
  test("records a session when the app was already active on mount and then backgrounds", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    jest.setSystemTime(new Date("2026-01-05T10:05:00"));
    getListener()("background");

    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
    const db = await initDb();
    const [event] = await db.select().from(activityEvents);
    expect(event.durationSeconds).toBe(300);
    expect(useActivityStatsStore.getState().currentStreak).toBe(1);
  });

  test("credits today's streak as soon as the app is active, before backgrounding", async () => {
    setAppState("active");
    captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });

    expect(useActivityStatsStore.getState().currentStreak).toBe(1);
    expect(useActivityStatsStore.getState().lastActiveDate).toBe("2026-01-05");
  });

  test("credits today's streak on transition to 'active', not just at mount", async () => {
    setAppState("background");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    expect(useActivityStatsStore.getState().lastActiveDate).toBeNull();

    getListener()("active");

    expect(useActivityStatsStore.getState().currentStreak).toBe(1);
    expect(useActivityStatsStore.getState().lastActiveDate).toBe("2026-01-05");
  });

  test("invalidates the activity history query so the progress grid refreshes", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    const { Wrapper, client } = makeWrapper();
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");
    renderHook(() => useAppSession(), { wrapper: Wrapper });
    jest.setSystemTime(new Date("2026-01-05T10:05:00"));
    getListener()("background");

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["activity", "history"],
      });
    });
  });

  test("ends the session once 'inactive' persists past the grace period without a return to 'active'", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession({ inactiveGraceMs: 5 }), {
      wrapper: makeWrapper().Wrapper,
    });
    jest.setSystemTime(new Date("2026-01-05T10:02:00"));
    getListener()("inactive");

    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
    const db = await initDb();
    const [event] = await db.select().from(activityEvents);
    expect(event.durationSeconds).toBe(120);
  });

  test("does not record a session for a transient 'inactive' blip that returns to 'active' before the grace period elapses", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    jest.setSystemTime(new Date("2026-01-05T10:02:00"));
    getListener()("inactive");
    getListener()("active"); // returns before the (default, real) grace period could ever elapse

    await Promise.resolve();
    await Promise.resolve();
    const db = await initDb();
    expect(await db.select().from(activityEvents)).toEqual([]);

    // The original session continued uninterrupted — duration is measured
    // from the initial mount time, not restarted at the "active" blip.
    jest.setSystemTime(new Date("2026-01-05T10:05:00"));
    getListener()("background");
    await waitFor(async () => {
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
    const [event] = await db.select().from(activityEvents);
    expect(event.durationSeconds).toBe(300);
  });

  test("a 'background' right after 'inactive' ends the session immediately, without waiting for the grace period", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    jest.setSystemTime(new Date("2026-01-05T10:02:00"));
    getListener()("inactive");
    getListener()("background");

    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
  });

  test("periodically flushes accrued time to SQLite while the session stays active", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession({ heartbeatIntervalMs: 5 }), {
      wrapper: makeWrapper().Wrapper,
    });
    jest.setSystemTime(new Date("2026-01-05T10:00:30"));

    const db = await initDb();
    await waitFor(async () => {
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
    const [firstEvent] = await db.select().from(activityEvents);
    expect(firstEvent.durationSeconds).toBe(30);

    // Session keeps running after a heartbeat flush — backgrounding afterward
    // only accounts for the time since the last flush, not the whole session.
    jest.setSystemTime(new Date("2026-01-05T10:01:00"));
    getListener()("background");
    await waitFor(async () => {
      expect(await db.select().from(activityEvents)).toHaveLength(2);
    });
    const events = await db.select().from(activityEvents);
    expect(events[1].durationSeconds).toBe(30);
  });

  test("does nothing when backgrounded without ever having been active", async () => {
    setAppState("background");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    getListener()("background");

    // Give any accidental async work a chance to run before asserting absence.
    await Promise.resolve();
    await Promise.resolve();

    const db = await initDb();
    expect(await db.select().from(activityEvents)).toEqual([]);
    expect(useActivityStatsStore.getState().lastActiveDate).toBeNull();
  });

  test("an unrecognized transition (e.g. iOS 'extension') neither starts nor ends a session", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    getListener()("extension" as AppStateStatus);
    jest.setSystemTime(new Date("2026-01-05T10:05:00"));
    getListener()("background");

    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
    const db = await initDb();
    const [event] = await db.select().from(activityEvents);
    // Duration measured from the original 'active' mount time, proving the
    // 'extension' transition didn't reset or otherwise touch the session.
    expect(event.durationSeconds).toBe(300);
  });

  test("going active again after a background starts a new session", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper().Wrapper });
    jest.setSystemTime(new Date("2026-01-05T10:01:00"));
    getListener()("background");
    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });

    getListener()("active");
    jest.setSystemTime(new Date("2026-01-05T10:03:00"));
    getListener()("background");
    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(2);
    });
  });
});
