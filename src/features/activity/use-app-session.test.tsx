// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";

import { _resetDbForTesting, activityEvents, initDb } from "@/lib/db";

import { resetActivityStatsForTesting } from "./__tests__/testing";
import { useActivityStatsStore } from "./stats-store";
import { useAppSession } from "./use-app-session";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
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

    renderHook(() => useAppSession(), { wrapper: makeWrapper() });
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

  test("also records the session when transitioning to 'inactive'", async () => {
    setAppState("active");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper() });
    jest.setSystemTime(new Date("2026-01-05T10:02:00"));
    getListener()("inactive");

    await waitFor(async () => {
      const db = await initDb();
      expect(await db.select().from(activityEvents)).toHaveLength(1);
    });
  });

  test("does nothing when backgrounded without ever having been active", async () => {
    setAppState("background");
    const getListener = captureAppStateListener();
    await initDb();

    renderHook(() => useAppSession(), { wrapper: makeWrapper() });
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

    renderHook(() => useAppSession(), { wrapper: makeWrapper() });
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

    renderHook(() => useAppSession(), { wrapper: makeWrapper() });
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
