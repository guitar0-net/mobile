// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { eq } from "drizzle-orm";

import {
  _resetDbForTesting,
  activityDaily,
  activityEvents,
  initDb,
  lessons,
} from "@/lib/db";

import {
  getAllTimeTotal,
  getDailyTotal,
  getDailyTotals,
  getTimelineEvents,
  insertLessonViewedEvent,
  insertSessionEvent,
  insertSongCompletionEvent,
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

describe("insertLessonViewedEvent", () => {
  test("writes a lesson_video_viewed row with the given device, lesson, and title snapshot", async () => {
    const db = await initDb();

    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-05T10:00:00.000Z",
    });

    const rows = await db.select().from(activityEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      deviceId: "device-1",
      type: "lesson_video_viewed",
      entityId: "lesson-1",
      title: "Первые аккорды",
      value: true,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
  });
});

describe("insertSongCompletionEvent", () => {
  test("writes a song_completed row with value true when completing", async () => {
    const db = await initDb();

    await insertSongCompletionEvent(db, {
      deviceId: "device-1",
      songId: "song-1",
      songTitle: "Кукушка",
      lessonTitle: "Урок 3",
      completed: true,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });

    const rows = await db.select().from(activityEvents);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      deviceId: "device-1",
      type: "song_completed",
      entityId: "song-1",
      title: "Кукушка",
      lessonTitle: "Урок 3",
      value: true,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
  });

  test("records un-completion as its own row rather than deleting the earlier completed row", async () => {
    const db = await initDb();

    await insertSongCompletionEvent(db, {
      deviceId: "device-1",
      songId: "song-1",
      songTitle: "Кукушка",
      lessonTitle: "Урок 3",
      completed: true,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
    await insertSongCompletionEvent(db, {
      deviceId: "device-1",
      songId: "song-1",
      songTitle: "Кукушка",
      lessonTitle: "Урок 3",
      completed: false,
      occurredAt: "2026-01-06T10:00:00.000Z",
    });

    const rows = await db.select().from(activityEvents);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.value)).toEqual([true, false]);
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

describe("getTimelineEvents", () => {
  test("returns lesson and song completion events in reverse-chronological order", async () => {
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

    const rows = await getTimelineEvents(db);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: "song_completed", title: "Кукушка" });
    expect(rows[1]).toMatchObject({
      type: "lesson_video_viewed",
      title: "Первые аккорды",
    });
  });

  test("excludes session events from the timeline", async () => {
    const db = await initDb();
    await insertSessionEvent(db, {
      deviceId: "device-1",
      durationSeconds: 60,
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-06T10:00:00.000Z",
    });

    const rows = await getTimelineEvents(db);

    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("lesson_video_viewed");
  });

  test("keeps the snapshotted title after the source lesson is renamed or deleted", async () => {
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "lesson-1",
      title: "Первые аккорды",
      videoUrl: "https://example.com/video.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-05T10:00:00.000Z",
    });

    await db.delete(lessons).where(eq(lessons.uuid, "lesson-1"));

    const rows = await getTimelineEvents(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Первые аккорды");
  });

  test("limits and offsets the page while preserving the reverse-chronological order", async () => {
    const db = await initDb();
    for (let i = 0; i < 5; i++) {
      await insertLessonViewedEvent(db, {
        deviceId: "device-1",
        lessonId: `lesson-${i}`,
        title: `Урок ${i}`,
        occurredAt: `2026-01-0${i + 1}T10:00:00.000Z`,
      });
    }

    const firstPage = await getTimelineEvents(db, { limit: 2, offset: 0 });
    const secondPage = await getTimelineEvents(db, { limit: 2, offset: 2 });

    expect(firstPage.map((r) => r.entityId)).toEqual(["lesson-4", "lesson-3"]);
    expect(secondPage.map((r) => r.entityId)).toEqual(["lesson-2", "lesson-1"]);
  });

  test("defaults to a page of 50 when no limit/offset is given", async () => {
    const db = await initDb();
    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-05T10:00:00.000Z",
    });

    const rows = await getTimelineEvents(db);
    expect(rows).toHaveLength(1);
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

describe("getAllTimeTotal", () => {
  test("returns 0 when no activity is recorded", async () => {
    const db = await initDb();
    expect(await getAllTimeTotal(db)).toBe(0);
  });

  test("sums totals across every recorded day", async () => {
    const db = await initDb();
    await upsertDailyTotal(db, "2026-01-05", 300);
    await upsertDailyTotal(db, "2026-01-06", 120);
    await upsertDailyTotal(db, "2027-03-01", 90);

    expect(await getAllTimeTotal(db)).toBe(510);
  });
});
