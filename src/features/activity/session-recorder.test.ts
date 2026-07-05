// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting, activityEvents, initDb } from "@/lib/db";

import { resetActivityStatsForTesting } from "./__tests__/testing";
import { getDailyTotal } from "./db/repository";
import { recordSession } from "./session-recorder";
import { useActivityStatsStore } from "./stats-store";

beforeEach(() => {
  _resetDbForTesting();
  resetActivityStatsForTesting();
});

describe("recordSession", () => {
  test("a same-day session writes one event, one daily total, and advances the streak", async () => {
    const db = await initDb();

    await recordSession(
      db,
      "device-1",
      new Date("2026-01-05T10:00:00"),
      new Date("2026-01-05T10:05:00"),
    );

    const events = await db.select().from(activityEvents);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ deviceId: "device-1", durationSeconds: 300 });

    expect(await getDailyTotal(db, "2026-01-05")).toBe(300);
    expect(useActivityStatsStore.getState()).toMatchObject({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: "2026-01-05",
    });
  });

  test("a zero-duration session is a no-op: no event, no daily total, no streak change", async () => {
    const db = await initDb();
    const same = new Date("2026-01-05T10:00:00");

    const chunks = await recordSession(db, "device-1", same, same);

    expect(chunks).toEqual([]);
    expect(await db.select().from(activityEvents)).toEqual([]);
    expect(await getDailyTotal(db, "2026-01-05")).toBe(0);
    expect(useActivityStatsStore.getState().lastActiveDate).toBeNull();
  });

  test("a session crossing midnight upserts both days and advances the streak once per day", async () => {
    const db = await initDb();

    const chunks = await recordSession(
      db,
      "device-1",
      new Date("2026-01-05T23:50:00"),
      new Date("2026-01-06T00:10:00"),
    );

    expect(chunks).toEqual([
      { date: "2026-01-05", seconds: 600 },
      { date: "2026-01-06", seconds: 600 },
    ]);
    expect(await getDailyTotal(db, "2026-01-05")).toBe(600);
    expect(await getDailyTotal(db, "2026-01-06")).toBe(600);
    expect(useActivityStatsStore.getState()).toMatchObject({
      currentStreak: 2,
      longestStreak: 2,
      lastActiveDate: "2026-01-06",
    });
  });

  test("writes a single event for the whole session even when it spans two days", async () => {
    const db = await initDb();

    await recordSession(
      db,
      "device-1",
      new Date("2026-01-05T23:50:00"),
      new Date("2026-01-06T00:10:00"),
    );

    const events = await db.select().from(activityEvents);
    expect(events).toHaveLength(1);
    expect(events[0].durationSeconds).toBe(1200);
  });
});
