// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/lib/storage";

import { resetActivityStatsForTesting } from "./__tests__/testing";
import { readDefaults, useActivityStatsStore } from "./stats-store";

beforeEach(() => {
  resetActivityStatsForTesting();
});

describe("useActivityStatsStore", () => {
  test("defaults to zero streaks and no last active date", () => {
    const state = useActivityStatsStore.getState();
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(0);
    expect(state.lastActiveDate).toBeNull();
  });

  test("advanceStreakForDay updates in-memory state", () => {
    useActivityStatsStore.getState().advanceStreakForDay("2026-01-05");

    const state = useActivityStatsStore.getState();
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(1);
    expect(state.lastActiveDate).toBe("2026-01-05");
  });

  test("advanceStreakForDay persists to MMKV so a fresh readDefaults() sees it", () => {
    useActivityStatsStore.getState().advanceStreakForDay("2026-01-05");
    useActivityStatsStore.getState().advanceStreakForDay("2026-01-06");

    expect(readDefaults()).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      lastActiveDate: "2026-01-06",
    });
    expect(storage.getNumber("activity.currentStreak")).toBe(2);
  });

  test("a missed day resets currentStreak but keeps longestStreak", () => {
    useActivityStatsStore.getState().advanceStreakForDay("2026-01-05");
    useActivityStatsStore.getState().advanceStreakForDay("2026-01-06");
    useActivityStatsStore.getState().advanceStreakForDay("2026-01-10");

    const state = useActivityStatsStore.getState();
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(2);
  });
});
