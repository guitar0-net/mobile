// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { _resetDbForTesting, initDb } from "@/lib/db";

import { resetActivityStatsForTesting } from "./__tests__/testing";
import { upsertDailyTotal } from "./db/repository";
import { enumerateLocalDayKeys, localDayKey, monthsBackDayKey } from "./logic";
import { useActivityHistory, useActivityStreak } from "./queries";
import { useActivityStatsStore } from "./stats-store";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

beforeEach(async () => {
  _resetDbForTesting();
  resetActivityStatsForTesting();
  await initDb();
});

describe("useActivityStreak", () => {
  test("defaults to zero streaks and zero todaySeconds when nothing recorded", async () => {
    const { result } = renderHook(() => useActivityStreak(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.todaySeconds).toBe(0));
    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
  });

  test("todaySeconds reflects today's activityDaily total", async () => {
    const db = await initDb();
    const today = localDayKey(new Date());
    await upsertDailyTotal(db, today, 480);

    const { result } = renderHook(() => useActivityStreak(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.todaySeconds).toBe(480));
  });

  test("reflects the currentStreak and longestStreak from the stats store", () => {
    useActivityStatsStore.getState().advanceStreakForDay(localDayKey(new Date()));

    const { result } = renderHook(() => useActivityStreak(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.currentStreak).toBe(1);
    expect(result.current.longestStreak).toBe(1);
  });

  test("displays zero currentStreak after a full missed day, even though the raw streak is still stored", () => {
    useActivityStatsStore.setState({
      currentStreak: 10,
      longestStreak: 10,
      lastActiveDate: "2000-01-01",
    });

    const { result } = renderHook(() => useActivityStreak(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(10);
  });
});

describe("useActivityHistory", () => {
  test("returns a dense range with recorded days populated and gaps defaulted to zero", async () => {
    const db = await initDb();
    const today = localDayKey(new Date());
    const expectedDays = enumerateLocalDayKeys(monthsBackDayKey(new Date(), 1), today);
    const recordedDate = expectedDays[1];
    await upsertDailyTotal(db, recordedDate, 1200);

    const { result } = renderHook(() => useActivityHistory(1), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(result.current.find((d) => d.date === recordedDate)?.totalSeconds).toBe(
        1200,
      ),
    );
    expect(result.current.map((d) => d.date)).toEqual(expectedDays);
    expect(
      result.current.filter((d) => d.date !== recordedDate).map((d) => d.totalSeconds),
    ).toEqual(expectedDays.filter((d) => d !== recordedDate).map(() => 0));
  });
});
