// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { sql } from "drizzle-orm";

import {
  _resetDbForTesting,
  chords,
  courseLessons,
  courses,
  getDb,
  initDb,
  lessons,
  schemes,
  songChords,
  songs,
} from "@/lib/db";

import { resetDbForTesting } from "./__tests__/testing";

beforeEach(() => {
  resetDbForTesting();
});

// ---------------------------------------------------------------------------
// initDb
// ---------------------------------------------------------------------------

describe("initDb", () => {
  test("resolves without throwing", async () => {
    await expect(initDb()).resolves.not.toThrow();
  });

  test("is idempotent — calling it twice does not throw", async () => {
    await initDb();
    await expect(initDb()).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getDb
// ---------------------------------------------------------------------------

describe("getDb", () => {
  test("throws when initDb has not been called yet", () => {
    expect(() => getDb()).toThrow(
      "Database not initialised — call initDb() before getDb()",
    );
  });

  test("returns the db instance after initDb", async () => {
    await initDb();
    expect(() => getDb()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// courses table
// ---------------------------------------------------------------------------

describe("courses table", () => {
  test("accepts an insert and returns the row on query", async () => {
    const db = await initDb();

    await db.insert(courses).values({
      uuid: "course-1",
      title: "Beginner",
      description: "For beginners",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const rows = await db.select().from(courses);
    expect(rows).toHaveLength(1);
    expect(rows[0].uuid).toBe("course-1");
    expect(rows[0].title).toBe("Beginner");
  });
});

// ---------------------------------------------------------------------------
// lessons table
// ---------------------------------------------------------------------------

describe("lessons table", () => {
  test("accepts an insert and returns the row on query", async () => {
    const db = await initDb();

    await db.insert(lessons).values({
      uuid: "lesson-1",
      title: "Open chords",
      videoUrl: "https://example.com/v.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const rows = await db.select().from(lessons);
    expect(rows).toHaveLength(1);
    expect(rows[0].uuid).toBe("lesson-1");
    expect(rows[0].videoDownloadStatus).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// course_lessons table
// ---------------------------------------------------------------------------

describe("course_lessons table", () => {
  test("accepts an insert and returns the row on query", async () => {
    const db = await initDb();

    await db.insert(courses).values({
      uuid: "course-1",
      title: "Beginner",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values({
      uuid: "lesson-1",
      title: "Open chords",
      videoUrl: "https://example.com/v.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(courseLessons).values({
      courseUuid: "course-1",
      lessonUuid: "lesson-1",
      order: 1,
    });

    const rows = await db.select().from(courseLessons);
    expect(rows).toHaveLength(1);
    expect(rows[0].courseUuid).toBe("course-1");
    expect(rows[0].lessonUuid).toBe("lesson-1");
    expect(rows[0].order).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// songs table
// ---------------------------------------------------------------------------

describe("songs table", () => {
  test("accepts an insert", async () => {
    const db = await initDb();

    await db.insert(songs).values({
      uuid: "song-1",
      title: "Knockin' on Heaven's Door",
      text: "Mama, take this badge off of me",
    });

    const rows = await db.select().from(songs);
    expect(rows).toHaveLength(1);
    expect(rows[0].uuid).toBe("song-1");
  });
});

// ---------------------------------------------------------------------------
// chords table
// ---------------------------------------------------------------------------

describe("chords table", () => {
  test("accepts an insert with boolean has_barre", async () => {
    const db = await initDb();

    await db.insert(chords).values({
      id: 1,
      title: "Am",
      musicalTitle: "Am",
      hasBarre: false,
    });

    const rows = await db.select().from(chords);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].hasBarre).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// song_chords join table
// ---------------------------------------------------------------------------

describe("song_chords table", () => {
  test("links a song to a chord", async () => {
    const db = await initDb();

    await db.insert(songs).values({ uuid: "song-1", title: "Song A", text: "..." });
    await db
      .insert(chords)
      .values({ id: 42, title: "G", musicalTitle: "G", hasBarre: false });
    await db.insert(songChords).values({ songUuid: "song-1", chordId: 42 });

    const rows = await db.select().from(songChords);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ songUuid: "song-1", chordId: 42 });
  });
});

// ---------------------------------------------------------------------------
// schemes table
// ---------------------------------------------------------------------------

describe("schemes table", () => {
  test("accepts an insert", async () => {
    const db = await initDb();

    await db.insert(schemes).values({
      id: 1,
      image: "https://example.com/scheme.png",
    });

    const rows = await db.select().from(schemes);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1);
    expect(rows[0].localImagePath).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FK indexes are present in the schema
// ---------------------------------------------------------------------------

describe("FK indexes", () => {
  const expectedIndexes = [
    "course_lessons_lesson_uuid_idx",
    "lesson_songs_song_uuid_idx",
    "song_chords_chord_id_idx",
    "song_schemes_scheme_id_idx",
  ];

  test.each(expectedIndexes)("index %s exists", async (indexName) => {
    const db = await initDb();

    const rows = await db.all<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ${indexName}`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });
});
