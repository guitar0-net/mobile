// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";

import {
  chords,
  courseLessons,
  courses,
  initDb,
  lessonAdditionLessons,
  lessonSongs,
  lessons,
  schemes,
  songChords,
  songSchemes,
  songs,
} from "@/lib/db";
import type { AppDb } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import type { components } from "@/lib/network/api.types";

import { resetDbForTesting } from "./__tests__/testing";
import { applyContentSnapshot, getContentVersion, syncAll } from "./sync";
import migrations from "../../../drizzle/migrations";

const mockDeletedFiles: string[] = [];
const mockDeleteFile = jest.fn((name: string) => mockDeletedFiles.push(name));
const mockCaptureException = jest.fn();

jest.mock("@/lib/analytics", () => ({
  capture: jest.fn(),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

jest.mock("expo-file-system", () => ({
  Paths: { document: "/documents" },
  Directory: jest.fn(),
  File: jest.fn((_dir: unknown, name: string) => ({
    exists: true,
    delete: () => mockDeleteFile(name),
  })),
}));

type SyncLessonsResponse = components["schemas"]["SyncLessonsResponse"];
type LessonSync = components["schemas"]["LessonFlat"];
type SongSync = components["schemas"]["SongFlat"];
type ChordSync = components["schemas"]["ChordSync"];
type SchemeSync = components["schemas"]["SchemeSync"];
type CourseSync = components["schemas"]["CourseFlat"];
type CourseLessonSync = components["schemas"]["CourseLessonFlat"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLesson(uuid: string, overrides: Partial<LessonSync> = {}): LessonSync {
  return {
    uuid,
    updated_at: "2026-01-01T00:00:00Z",
    title: "Открытые аккорды",
    video_url: "https://example.com/v.mp4",
    addition_lesson_uuids: [],
    ...overrides,
  };
}

function makeSong(
  uuid: string,
  lessonUuid: string,
  overrides: Partial<SongSync> = {},
): SongSync {
  return {
    uuid,
    lesson_uuid: lessonUuid,
    title: "Звезда по имени Солнце",
    text: "Текст песни",
    chord_text: "[Am]Текст песни",
    metronome: 120,
    chord_ids: [],
    scheme_ids: [],
    ...overrides,
  };
}

function makeChord(id: number, overrides: Partial<ChordSync> = {}): ChordSync {
  return {
    id,
    title: "Am",
    musical_title: "Am",
    has_barre: false,
    ...overrides,
  };
}

function makeScheme(id: number, overrides: Partial<SchemeSync> = {}): SchemeSync {
  return {
    id,
    image: `https://example.com/scheme-${id}.png`,
    inscription: `Scheme ${id}`,
    height: 200,
    width: 300,
    ...overrides,
  };
}

function makeCourse(uuid: string, overrides: Partial<CourseSync> = {}): CourseSync {
  return {
    uuid,
    title: "Курс для начинающих",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeCourseLesson(
  courseUuid: string,
  lessonUuid: string,
  order: number,
): CourseLessonSync {
  return { course_uuid: courseUuid, lesson_uuid: lessonUuid, order };
}

function makeSyncResponse(
  overrides: Partial<SyncLessonsResponse> = {},
): SyncLessonsResponse {
  return {
    version: "2026-01-01T00:00:00Z",
    lesson_uuids: [],
    lessons: [],
    songs: [],
    chords: [],
    schemes: [],
    course_uuids: [],
    courses: [],
    course_lessons: [],
    ...overrides,
  };
}

beforeEach(() => {
  resetDbForTesting();
  mockDeletedFiles.length = 0;
  mockDeleteFile.mockClear();
  mockCaptureException.mockClear();
});

// ---------------------------------------------------------------------------
// Basic persistence — lessons
// ---------------------------------------------------------------------------

test("1 lesson in response → 1 row inserted in lessons table", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["lesson-1"],
          lessons: [makeLesson("lesson-1")],
        }),
      ),
  });

  const rows = await db.select().from(lessons);
  expect(rows).toHaveLength(1);
});

test("lesson row stores server updated_at, not client clock", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1", { updated_at: "2026-03-15T10:00:00Z" })],
        }),
      ),
  });

  const [row] = await db.select({ updatedAt: lessons.updatedAt }).from(lessons);
  expect(row.updatedAt).toBe("2026-03-15T10:00:00Z");
});

test("3 lessons in response → 3 rows in lessons table", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["a", "b", "c"],
          lessons: ["a", "b", "c"].map((id) => makeLesson(id)),
        }),
      ),
  });

  const rows = await db.select().from(lessons);
  expect(rows).toHaveLength(3);
});

test("syncAll saves the server version together with the content", async () => {
  const db = await initDb();

  const result = await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ version: "2026-06-01T12:00:00Z" })),
  });

  expect(result).toEqual({ previousVersion: null, version: "2026-06-01T12:00:00Z" });
  expect(getContentVersion(db)).toBe("2026-06-01T12:00:00Z");
});

test("syncAll keeps the local version when the server has no lessons", async () => {
  const db = await initDb();
  await syncAll(db, {
    getSyncData: () => Promise.resolve(makeSyncResponse({ version: "v1" })),
  });

  const result = await syncAll(db, {
    getSyncData: () => Promise.resolve(makeSyncResponse({ version: null })),
  });

  expect(result).toEqual({ previousVersion: "v1", version: "v1" });
  expect(getContentVersion(db)).toBe("v1");
});

// ---------------------------------------------------------------------------
// Song persistence
// ---------------------------------------------------------------------------

test("lesson with 2 songs → 2 rows in songs table linked to the lesson", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("song-1", "l1"), makeSong("song-2", "l1")],
        }),
      ),
  });

  const songRows = await db.select().from(songs);
  expect(songRows).toHaveLength(2);

  const junctionRows = await db.select().from(lessonSongs);
  expect(junctionRows).toHaveLength(2);
  expect(junctionRows.every((r) => r.lessonUuid === "l1")).toBe(true);
});

describe("song chord text", () => {
  function syncSong(db: AppDb, song: Partial<SongSync>, version: string) {
    return syncAll(db, {
      getSyncData: () =>
        Promise.resolve(
          makeSyncResponse({
            version,
            lesson_uuids: ["l1"],
            lessons: [makeLesson("l1")],
            songs: [makeSong("s1", "l1", song)],
          }),
        ),
    });
  }

  async function storedSong(db: AppDb) {
    const [row] = await db
      .select({ text: songs.text, chordText: songs.chordText })
      .from(songs);
    return row;
  }

  test("stores chord_text next to the unchanged text", async () => {
    const db = await initDb();

    await syncSong(
      db,
      { text: "**Am**\nМы не знали", chord_text: "Мы не [Am]знали" },
      "v1",
    );

    expect(await storedSong(db)).toEqual({
      text: "**Am**\nМы не знали",
      chordText: "Мы не [Am]знали",
    });
  });

  test("a delta replaces chord_text, including with an empty string", async () => {
    const db = await initDb();
    await syncSong(db, { chord_text: "[Am]Было" }, "2026-01-01T00:00:00Z");

    await syncSong(db, { chord_text: "[Em]Стало" }, "2026-02-01T00:00:00Z");
    expect((await storedSong(db)).chordText).toBe("[Em]Стало");

    await syncSong(db, { chord_text: "" }, "2026-03-01T00:00:00Z");
    expect((await storedSong(db)).chordText).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Chord persistence
// ---------------------------------------------------------------------------

test("chord is upserted into chords table", async () => {
  const db = await initDb();
  const chord = makeChord(1, { title: "Am", svg_horizontal: "<svg>v1</svg>" });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { chord_ids: [chord.id] })],
          chords: [chord],
        }),
      ),
  });

  const rows = await db.select().from(chords);
  expect(rows).toHaveLength(1);
  expect(rows[0].title).toBe("Am");
});

test("chord shared across two songs appears once in chords table", async () => {
  const db = await initDb();
  const chord = makeChord(7, { title: "Em" });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [
            makeSong("s1", "l1", { chord_ids: [chord.id] }),
            makeSong("s2", "l1", { chord_ids: [chord.id] }),
          ],
          chords: [chord],
        }),
      ),
  });

  const rows = await db.select().from(chords);
  expect(rows).toHaveLength(1);

  const junctionRows = await db.select().from(songChords);
  expect(junctionRows).toHaveLength(2);
});

test("chord SVG is updated on re-sync", async () => {
  const db = await initDb();
  const chord = makeChord(1, { svg_horizontal: "<svg>v1</svg>" });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { chord_ids: [chord.id] })],
          chords: [chord],
        }),
      ),
  });

  const updated = { ...chord, svg_horizontal: "<svg>v2</svg>" };

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { chord_ids: [chord.id] })],
          chords: [updated],
        }),
      ),
  });

  const [row] = await db.select({ svgHorizontal: chords.svgHorizontal }).from(chords);
  expect(row.svgHorizontal).toBe("<svg>v2</svg>");
});

// ---------------------------------------------------------------------------
// Scheme persistence
// ---------------------------------------------------------------------------

test("scheme is written without touching the network for its image", async () => {
  const db = await initDb();
  const scheme = makeScheme(42, { image: "https://example.com/scheme.png" });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { scheme_ids: [scheme.id] })],
          schemes: [scheme],
        }),
      ),
  });

  const [row] = await db.select().from(schemes);
  expect(row).toEqual({
    id: 42,
    image: "https://example.com/scheme.png",
    inscription: "Scheme 42",
    height: 200,
    width: 300,
    localImagePath: null,
  });
});

describe("addition lessons", () => {
  async function readLinks(db: Awaited<ReturnType<typeof initDb>>) {
    const rows = await db.select().from(lessonAdditionLessons);
    return rows.map((row) => `${row.lessonUuid}->${row.additionLessonUuid}`).sort();
  }

  function syncWith(
    db: Awaited<ReturnType<typeof initDb>>,
    payload: SyncLessonsResponse,
  ) {
    return syncAll(db, { getSyncData: () => Promise.resolve(payload) });
  }

  test("links a lesson to addition lessons listed later in the same payload", async () => {
    const db = await initDb();

    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1", "a1", "a2"],
        lessons: [
          makeLesson("l1", { addition_lesson_uuids: ["a1", "a2"] }),
          makeLesson("a1"),
          makeLesson("a2"),
        ],
      }),
    );

    expect(await readLinks(db)).toEqual(["l1->a1", "l1->a2"]);
  });

  test("a delta replaces the links of resent lessons and keeps the others", async () => {
    const db = await initDb();
    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1", "l2", "a1", "a2"],
        lessons: [
          makeLesson("l1", { addition_lesson_uuids: ["a1"] }),
          makeLesson("l2", { addition_lesson_uuids: ["a1"] }),
          makeLesson("a1"),
          makeLesson("a2"),
        ],
      }),
    );

    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1", "l2", "a1", "a2"],
        lessons: [makeLesson("l1", { addition_lesson_uuids: ["a2"] })],
      }),
    );

    expect(await readLinks(db)).toEqual(["l1->a2", "l2->a1"]);
  });

  test("drops links to an addition lesson that was unpublished", async () => {
    const db = await initDb();
    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1", "a1"],
        lessons: [
          makeLesson("l1", { addition_lesson_uuids: ["a1"] }),
          makeLesson("a1"),
        ],
      }),
    );

    await syncWith(db, makeSyncResponse({ lesson_uuids: ["l1"] }));

    expect(await readLinks(db)).toEqual([]);
    expect((await db.select().from(lessons)).map((row) => row.uuid)).toEqual(["l1"]);
  });

  test("drops the links of a lesson that was unpublished", async () => {
    const db = await initDb();
    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1", "a1"],
        lessons: [
          makeLesson("l1", { addition_lesson_uuids: ["a1"] }),
          makeLesson("a1"),
        ],
      }),
    );

    await syncWith(db, makeSyncResponse({ lesson_uuids: ["a1"] }));

    expect(await readLinks(db)).toEqual([]);
  });

  test("skips an addition lesson that is not in the local content", async () => {
    const db = await initDb();

    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1"],
        lessons: [makeLesson("l1", { addition_lesson_uuids: ["unknown"] })],
      }),
    );

    expect(await readLinks(db)).toEqual([]);
  });

  test("accepts lessons from a payload that predates addition lessons", async () => {
    const db = await initDb();
    const { addition_lesson_uuids: _omitted, ...legacyLesson } = makeLesson("l1");

    await syncWith(
      db,
      makeSyncResponse({
        lesson_uuids: ["l1"],
        lessons: [legacyLesson as LessonSync],
      }),
    );

    expect(await db.select().from(lessons)).toHaveLength(1);
    expect(await readLinks(db)).toEqual([]);
  });
});

describe("downloaded scheme images across syncs", () => {
  function responseWith(
    scheme: SchemeSync,
    songs = [makeSong("s1", "l1", { scheme_ids: [scheme.id] })],
  ) {
    return makeSyncResponse({
      lesson_uuids: ["l1"],
      lessons: [makeLesson("l1")],
      songs,
      schemes: [scheme],
    });
  }

  async function syncWithDownloadedImage(scheme: SchemeSync) {
    const db = await initDb();
    await syncAll(db, {
      getSyncData: () => Promise.resolve(responseWith(scheme)),
    });
    await db.update(schemes).set({ localImagePath: `${scheme.id}.jpg` });
    return db;
  }

  test("keeps the downloaded file when the image URL is unchanged", async () => {
    const scheme = makeScheme(7, { image: "/media/a.jpg", inscription: "Old" });
    const db = await syncWithDownloadedImage(scheme);

    await syncAll(db, {
      getSyncData: () =>
        Promise.resolve(responseWith({ ...scheme, inscription: "New" })),
    });

    const [row] = await db.select().from(schemes);
    expect(row.inscription).toBe("New");
    expect(row.localImagePath).toBe("7.jpg");
    expect(mockDeletedFiles).toEqual([]);
  });

  test("queues the scheme again and deletes the old file when the image URL changes", async () => {
    const scheme = makeScheme(7, { image: "/media/a.jpg" });
    const db = await syncWithDownloadedImage(scheme);

    await syncAll(db, {
      getSyncData: () =>
        Promise.resolve(responseWith({ ...scheme, image: "/media/b.jpg" })),
    });

    const [row] = await db.select().from(schemes);
    expect(row.localImagePath).toBeNull();
    expect(mockDeletedFiles).toEqual(["7.jpg"]);
  });

  test("removes a scheme no song uses any more, together with its file", async () => {
    const scheme = makeScheme(7, { image: "/media/a.jpg" });
    const db = await syncWithDownloadedImage(scheme);

    await syncAll(db, {
      getSyncData: () => Promise.resolve(responseWith(scheme, [makeSong("s1", "l1")])),
    });

    expect(await db.select().from(schemes)).toEqual([]);
    expect(mockDeletedFiles).toEqual(["7.jpg"]);
  });

  test("a file that cannot be deleted does not fail the saved sync", async () => {
    const scheme = makeScheme(7, { image: "/media/a.jpg" });
    const db = await syncWithDownloadedImage(scheme);
    const error = new Error("EACCES");
    mockDeleteFile.mockImplementationOnce(() => {
      throw error;
    });

    const { version } = await syncAll(db, {
      getSyncData: () =>
        Promise.resolve({
          ...responseWith({ ...scheme, image: "/media/b.jpg" }),
          version: "v2",
        }),
    });

    expect(version).toBe("v2");
    const [row] = await db.select().from(schemes);
    expect(row.image).toBe("/media/b.jpg");
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      stage: "scheme_images",
    });
  });
});

test("scheme shared across two songs appears once in schemes, twice in song_schemes", async () => {
  const db = await initDb();
  const scheme = makeScheme(10);

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [
            makeSong("s1", "l1", { scheme_ids: [scheme.id] }),
            makeSong("s2", "l1", { scheme_ids: [scheme.id] }),
          ],
          schemes: [scheme],
        }),
      ),
  });

  const schemeRows = await db.select().from(schemes);
  expect(schemeRows).toHaveLength(1);

  const junctionRows = await db.select().from(songSchemes);
  expect(junctionRows).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// Upsert — updating an existing lesson
// ---------------------------------------------------------------------------

test("existing lesson is updated with new title on second sync", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1", { title: "Старое название" })],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1", { title: "Новое название" })],
        }),
      ),
  });

  const [row] = await db.select({ title: lessons.title }).from(lessons);
  expect(row.title).toBe("Новое название");
});

test("updated lesson keeps only the new songs, removing old ones", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("old-song", "l1")],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("new-song", "l1")],
        }),
      ),
  });

  const rows = await db.select({ uuid: songs.uuid }).from(songs);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("new-song");
});

// ---------------------------------------------------------------------------
// Deletion — removed lessons pruned from local DB
// ---------------------------------------------------------------------------

test("lesson absent from lesson_uuids is deleted from SQLite", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [makeLesson("l1"), makeLesson("l2")],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [],
        }),
      ),
  });

  const rows = await db.select({ uuid: lessons.uuid }).from(lessons);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("l1");
});

test("songs of a deleted lesson are also removed", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1")],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ lesson_uuids: [], lessons: [] })),
  });

  const rows = await db.select().from(songs);
  expect(rows).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Delta sync — the stored version is sent as since
// ---------------------------------------------------------------------------

test("syncAll asks for everything when no content is stored", async () => {
  const db = await initDb();
  const getSyncData = jest
    .fn<Promise<SyncLessonsResponse>, [string | null]>()
    .mockResolvedValue(makeSyncResponse());

  await syncAll(db, { getSyncData });

  expect(getSyncData).toHaveBeenCalledWith(null);
});

test("syncAll asks only for changes since the stored version", async () => {
  const db = await initDb();
  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ version: "2026-05-01T00:00:00Z" })),
  });
  const getSyncData = jest
    .fn<Promise<SyncLessonsResponse>, [string | null]>()
    .mockResolvedValue(makeSyncResponse());

  await syncAll(db, { getSyncData });

  expect(getSyncData).toHaveBeenCalledWith("2026-05-01T00:00:00Z");
});

test("delta sync with empty lessons list does not create duplicate rows", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ lesson_uuids: ["l1"], lessons: [] })),
  });

  const rows = await db.select().from(lessons);
  expect(rows).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// song_chords / song_schemes junction cleanup
// ---------------------------------------------------------------------------

test("song_chords rows for removed song are deleted on lesson update", async () => {
  const db = await initDb();
  const chord = makeChord(7, { title: "Em" });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-old", "l1", { chord_ids: [chord.id] })],
          chords: [chord],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-new", "l1")],
        }),
      ),
  });

  const junctionRows = await db.select().from(songChords);
  expect(junctionRows).toHaveLength(0);
});

test("song_schemes rows for removed song are deleted on lesson update", async () => {
  const db = await initDb();
  const scheme = makeScheme(5);

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-old", "l1", { scheme_ids: [scheme.id] })],
          schemes: [scheme],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-new", "l1")],
        }),
      ),
  });

  const junctionRows = await db.select().from(songSchemes);
  expect(junctionRows).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Course sync — persistence
// ---------------------------------------------------------------------------

test("1 course in response → 1 row inserted in courses table", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["course-1"],
          courses: [makeCourse("course-1")],
        }),
      ),
  });

  const rows = await db.select().from(courses);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("course-1");
});

test("course with 2 lessons → 2 rows in course_lessons table", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [makeLesson("l1"), makeLesson("l2")],
          course_uuids: ["c1"],
          courses: [makeCourse("c1")],
          course_lessons: [
            makeCourseLesson("c1", "l1", 1),
            makeCourseLesson("c1", "l2", 2),
          ],
        }),
      ),
  });

  const rows = await db.select().from(courseLessons);
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.courseUuid === "c1")).toBe(true);
  const orders = rows.map((r) => r.order).sort((a, b) => a - b);
  expect(orders).toEqual([1, 2]);
});

test("existing course is updated with new title on second sync", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1"],
          courses: [makeCourse("c1", { title: "Старое название" })],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1"],
          courses: [makeCourse("c1", { title: "Новое название" })],
        }),
      ),
  });

  const [row] = await db.select({ title: courses.title }).from(courses);
  expect(row.title).toBe("Новое название");
});

test("re-sync replaces course lesson memberships", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [makeLesson("l1"), makeLesson("l2")],
          course_uuids: ["c1"],
          courses: [makeCourse("c1")],
          course_lessons: [makeCourseLesson("c1", "l1", 1)],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [],
          course_uuids: ["c1"],
          courses: [makeCourse("c1")],
          course_lessons: [makeCourseLesson("c1", "l2", 1)],
        }),
      ),
  });

  const rows = await db.select().from(courseLessons);
  expect(rows).toHaveLength(1);
  expect(rows[0].lessonUuid).toBe("l2");
});

// ---------------------------------------------------------------------------
// Course sync — deletion / pruning
// ---------------------------------------------------------------------------

test("course absent from course_uuids is deleted from SQLite", async () => {
  const db = await initDb();

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1", "c2"],
          courses: [makeCourse("c1"), makeCourse("c2")],
        }),
      ),
  });

  await syncAll(db, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1"],
          courses: [makeCourse("c1")],
        }),
      ),
  });

  const rows = await db.select({ uuid: courses.uuid }).from(courses);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("c1");
});

describe("atomic write", () => {
  test("a failing write leaves the previously synced content untouched", async () => {
    const db = await initDb();
    await syncAll(db, {
      getSyncData: () =>
        Promise.resolve(
          makeSyncResponse({
            lesson_uuids: ["l1"],
            lessons: [makeLesson("l1", { title: "Старое название" })],
            course_uuids: ["c1"],
            courses: [makeCourse("c1")],
            course_lessons: [makeCourseLesson("c1", "l1", 1)],
          }),
        ),
    });

    const error = await syncAll(db, {
      getSyncData: () =>
        Promise.resolve(
          makeSyncResponse({
            version: "2026-02-01T00:00:00Z",
            lesson_uuids: ["l1"],
            lessons: [makeLesson("l1", { title: "Новое название" })],
            course_uuids: ["c1"],
            courses: [makeCourse("c1")],
            course_lessons: [makeCourseLesson("c1", "missing-lesson", 1)],
          }),
        ),
    }).catch((err: unknown) => err);

    expect((error as Error).message).toBe("FOREIGN KEY constraint failed");

    const [lesson] = await db.select().from(lessons);
    expect(lesson.title).toBe("Старое название");
    const memberships = await db.select().from(courseLessons);
    expect(memberships).toEqual([
      expect.objectContaining({ courseUuid: "c1", lessonUuid: "l1" }),
    ]);
    expect(getContentVersion(db)).toBe("2026-01-01T00:00:00Z");
  });
});

// ---------------------------------------------------------------------------
// Bundled content snapshot
// ---------------------------------------------------------------------------

describe("applyContentSnapshot", () => {
  const SNAPSHOT_VERSION = "2026-05-30T05:29:18.303356+00:00";

  function snapshotWith(overrides: Partial<SyncLessonsResponse> = {}) {
    return {
      snapshotVersion: SNAPSHOT_VERSION,
      readSnapshot: () =>
        Promise.resolve({
          ...makeSyncResponse({
            lesson_uuids: ["l1"],
            lessons: [makeLesson("l1", { title: "Из снимка" })],
            ...overrides,
          }),
          version: SNAPSHOT_VERSION,
        }),
    };
  }

  async function syncedDb(version: string) {
    const db = await initDb();
    await syncAll(db, {
      getSyncData: () =>
        Promise.resolve(
          makeSyncResponse({
            version,
            lesson_uuids: ["l1", "l2"],
            lessons: [
              makeLesson("l1", { title: "Из сети" }),
              makeLesson("l2", { title: "Удалён в снимке" }),
            ],
          }),
        ),
    });
    return db;
  }

  test("fills an empty database and stores the snapshot version", async () => {
    const db = await initDb();

    const result = await applyContentSnapshot(db, snapshotWith());

    expect(result).toMatchObject({
      applied: true,
      snapshotVersion: SNAPSHOT_VERSION,
      previousVersion: null,
    });
    expect(await db.select({ title: lessons.title }).from(lessons)).toEqual([
      { title: "Из снимка" },
    ]);
    expect(getContentVersion(db)).toBe(SNAPSHOT_VERSION);
  });

  test("replaces older local content, removing lessons the snapshot no longer has", async () => {
    const db = await syncedDb("2026-01-01T00:00:00Z");

    const result = await applyContentSnapshot(db, snapshotWith());

    expect(result.applied).toBe(true);
    expect(result.previousVersion).toBe("2026-01-01T00:00:00Z");
    expect(
      await db.select({ uuid: lessons.uuid, title: lessons.title }).from(lessons),
    ).toEqual([{ uuid: "l1", title: "Из снимка" }]);
    expect(getContentVersion(db)).toBe(SNAPSHOT_VERSION);
  });

  test.each([
    ["the same", SNAPSHOT_VERSION],
    ["a newer", "2026-07-01T00:00:00+00:00"],
  ])("leaves local content with %s version untouched", async (_label, localVersion) => {
    const db = await syncedDb(localVersion);
    const readSnapshot = jest.fn();

    const result = await applyContentSnapshot(db, { ...snapshotWith(), readSnapshot });

    expect(result.applied).toBe(false);
    expect(readSnapshot).not.toHaveBeenCalled();
    expect(await db.select({ uuid: lessons.uuid }).from(lessons)).toHaveLength(2);
    expect(getContentVersion(db)).toBe(localVersion);
  });

  test("replaces local content whose version cannot be compared", async () => {
    const db = await syncedDb("not-a-date");

    const result = await applyContentSnapshot(db, snapshotWith());

    expect(result.applied).toBe(true);
    expect(getContentVersion(db)).toBe(SNAPSHOT_VERSION);
  });

  test("keeps downloaded videos and scheme images", async () => {
    const db = await initDb();
    const scheme = makeScheme(7, { image: "/media/a.jpg" });
    const content = {
      version: "2026-01-01T00:00:00Z",
      lesson_uuids: ["l1"],
      lessons: [makeLesson("l1")],
      songs: [makeSong("s1", "l1", { scheme_ids: [7] })],
      schemes: [scheme],
    };
    await syncAll(db, {
      getSyncData: () => Promise.resolve(makeSyncResponse(content)),
    });
    await db
      .update(lessons)
      .set({ localVideoPath: "l1.mp4", videoDownloadStatus: "downloaded" });
    await db.update(schemes).set({ localImagePath: "7.jpg" });

    const result = await applyContentSnapshot(db, snapshotWith(content));

    expect(result.applied).toBe(true);
    const [lesson] = await db.select().from(lessons);
    expect(lesson).toMatchObject({
      localVideoPath: "l1.mp4",
      videoDownloadStatus: "downloaded",
    });
    const [savedScheme] = await db.select().from(schemes);
    expect(savedScheme.localImagePath).toBe("7.jpg");
  });

  test("stores chord_text from the snapshot", async () => {
    const db = await initDb();

    await applyContentSnapshot(
      db,
      snapshotWith({ songs: [makeSong("s1", "l1", { chord_text: "[Am]Из снимка" })] }),
    );

    const [song] = await db.select({ chordText: songs.chordText }).from(songs);
    expect(song.chordText).toBe("[Am]Из снимка");
  });

  test("a device that synced songs before chord_text existed applies the snapshot again", async () => {
    const sqlite = openDatabaseSync("upgraded.db");
    const db = drizzle(sqlite, { schema });
    await migrate(db, {
      ...migrations,
      journal: {
        ...migrations.journal,
        entries: migrations.journal.entries.slice(0, 5),
      },
    });
    sqlite.execSync(`
      INSERT INTO content_meta (id, version) VALUES (1, '${SNAPSHOT_VERSION}');
      INSERT INTO songs (uuid, title, text) VALUES ('s1', 'Песня', '**Am**');
    `);

    await migrate(db, migrations);
    const result = await applyContentSnapshot(
      db,
      snapshotWith({ songs: [makeSong("s1", "l1", { chord_text: "[Am]Из снимка" })] }),
    );

    expect(result).toMatchObject({ applied: true, previousVersion: null });
    const [song] = await db.select({ chordText: songs.chordText }).from(songs);
    expect(song.chordText).toBe("[Am]Из снимка");
    expect(getContentVersion(db)).toBe(SNAPSHOT_VERSION);
  });

  test("a failing write changes neither the content nor the version", async () => {
    const db = await syncedDb("2026-01-01T00:00:00Z");

    const error = await applyContentSnapshot(
      db,
      snapshotWith({ course_lessons: [makeCourseLesson("c1", "missing-lesson", 1)] }),
    ).catch((err: unknown) => err);

    expect((error as Error).message).toBe("FOREIGN KEY constraint failed");
    expect(await db.select({ uuid: lessons.uuid }).from(lessons)).toHaveLength(2);
    expect(getContentVersion(db)).toBe("2026-01-01T00:00:00Z");
  });
});
