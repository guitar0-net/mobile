// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting, activityDaily, activityEvents, initDb } from "@/lib/db";

import {
  getDailyTotal,
  getDailyTotals,
  insertSessionEvent,
  upsertDailyTotal,
} from "./repository";

beforeEach(() => {
  _resetDbForTesting();
});

describe("insertSessionEvent", () => {
  test("writes a session row with the given device, duration, and occurredAt", async () => {
    const db = await initDb();

    await insertSessionEvent(db, {
      deviceId: "device-1",
      durationSeconds: 125,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });

    const rows = await db.select().from(activityEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      deviceId: "device-1",
      type: "session",
      durationSeconds: 125,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
  });
});

describe("upsertDailyTotal", () => {
  test("creates a new row for a date with no existing total", async () => {
    const db = await initDb();

    await upsertDailyTotal(db, "2026-01-05", 300);

    const rows = await db.select().from(activityDaily);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ date: "2026-01-05", totalSeconds: 300 });
  });

  test("accumulates onto an existing total for the same date", async () => {
    const db = await initDb();

    await upsertDailyTotal(db, "2026-01-05", 300);
    await upsertDailyTotal(db, "2026-01-05", 120);

    const rows = await db.select().from(activityDaily);
    expect(rows).toHaveLength(1);
    expect(rows[0].totalSeconds).toBe(420);
  });

  test("does not affect other dates' totals", async () => {
    const db = await initDb();

    await upsertDailyTotal(db, "2026-01-05", 300);
    await upsertDailyTotal(db, "2026-01-06", 60);

    const rows = await db.select().from(activityDaily);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.date === "2026-01-05")?.totalSeconds).toBe(300);
    expect(rows.find((r) => r.date === "2026-01-06")?.totalSeconds).toBe(60);
  });
});

describe("getDailyTotals", () => {
  test("returns only the rows within the requested date range, inclusive", async () => {
    const db = await initDb();
    await upsertDailyTotal(db, "2026-01-04", 100);
    await upsertDailyTotal(db, "2026-01-05", 200);
    await upsertDailyTotal(db, "2026-01-06", 300);
    await upsertDailyTotal(db, "2026-01-10", 999);

    const rows = await getDailyTotals(db, "2026-01-04", "2026-01-06");

    expect(rows).toEqual(
      expect.arrayContaining([
        { date: "2026-01-04", totalSeconds: 100 },
        { date: "2026-01-05", totalSeconds: 200 },
        { date: "2026-01-06", totalSeconds: 300 },
      ]),
    );
    expect(rows).toHaveLength(3);
  });

  test("returns an empty array when nothing falls in range", async () => {
    const db = await initDb();
    await upsertDailyTotal(db, "2026-01-10", 999);

    expect(await getDailyTotals(db, "2026-01-04", "2026-01-06")).toEqual([]);
  });
});

describe("getDailyTotal", () => {
  test("returns 0 for a date with no recorded activity", async () => {
    const db = await initDb();
    expect(await getDailyTotal(db, "2026-01-05")).toBe(0);
  });

  test("returns the accumulated total for a date", async () => {
    const db = await initDb();
    await upsertDailyTotal(db, "2026-01-05", 300);
    await upsertDailyTotal(db, "2026-01-05", 120);

    expect(await getDailyTotal(db, "2026-01-05")).toBe(420);
  });
});
