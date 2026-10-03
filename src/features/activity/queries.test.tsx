// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { _resetDbForTesting, initDb } from "@/lib/db";
import { createTestQueryClient } from "@/lib/network/__tests__/testing";

import { resetActivityStatsForTesting } from "./__tests__/testing";
import {
  insertLessonViewedEvent,
  insertSongCompletionEvent,
  upsertDailyTotal,
} from "./db/repository";
import { enumerateLocalDayKeys, localDayKey, monthsBackDayKey } from "./logic";
import {
  useActivityHistory,
  useActivityStreak,
  useActivityTimeline,
  useActivityTotalTime,
} from "./queries";
import { useActivityStatsStore } from "./stats-store";

function makeWrapper() {
  const client = createTestQueryClient();
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

describe("useActivityTotalTime", () => {
  test("defaults to 0 when nothing recorded", async () => {
    const { result } = renderHook(() => useActivityTotalTime(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(0));
  });

  test("sums totals across every recorded day, not just today", async () => {
    const db = await initDb();
    await upsertDailyTotal(db, "2026-01-01", 300);
    await upsertDailyTotal(db, localDayKey(new Date()), 120);

    const { result } = renderHook(() => useActivityTotalTime(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(420));
  });
});

describe("useActivityTimeline", () => {
  test("returns completion events with their snapshotted titles, most recent first", async () => {
    const db = await initDb();
    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
    await insertSongCompletionEvent(db, {
      deviceId: "device-1",
      songId: "song-1",
      songTitle: "Кукушка",
      lessonTitle: "Урок 3",
      completed: true,
      occurredAt: "2026-01-06T10:00:00.000Z",
    });

    const { result } = renderHook(() => useActivityTimeline(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    expect(result.current.entries[0]).toMatchObject({
      type: "song_completed",
      title: "Кукушка",
      lessonTitle: "Урок 3",
      value: true,
    });
    expect(result.current.entries[1]).toMatchObject({
      type: "lesson_video_viewed",
      title: "Первые аккорды",
    });
  });

  test("reports no next page when everything fits on the first page", async () => {
    const db = await initDb();
    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-05T10:00:00.000Z",
    });

    const { result } = renderHook(() => useActivityTimeline(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(false);
  });

  test("fetchNextPage appends the next page of older entries", async () => {
    const db = await initDb();
    for (let i = 0; i < 25; i++) {
      await insertLessonViewedEvent(db, {
        deviceId: "device-1",
        lessonId: `lesson-${i}`,
        title: `Урок ${i}`,
        occurredAt: `2026-01-${String(i + 1).padStart(2, "0")}T10:00:00.000Z`,
      });
    }

    const { result } = renderHook(() => useActivityTimeline(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.entries).toHaveLength(20));
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.entries).toHaveLength(25));
    expect(result.current.hasNextPage).toBe(false);
    const ids = result.current.entries.map((e) => e.entityId);
    expect(new Set(ids).size).toBe(25);
  });
});
