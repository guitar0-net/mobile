// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  chords,
  courseLessons,
  courses,
  initDb,
  lessonSongs,
  lessons,
  schemes,
  songChords,
  songSchemes,
  songs,
} from "@/lib/db";
import { RequestTimeoutError } from "@/lib/network";
import type { components } from "@/lib/network/api.types";

import { resetDbForTesting } from "./__tests__/testing";
import { syncAll } from "./sync";

jest.mock("expo-file-system", () => {
  const mockDir = { create: jest.fn() };
  const MockDir = jest.fn(() => mockDir);
  const MockFSFile = Object.assign(jest.fn(), { downloadFileAsync: jest.fn() });
  return {
    Paths: { document: "/mock/documents" },
    Directory: MockDir,
    File: MockFSFile,
  };
});

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

const noopDownload = jest
  .fn<Promise<string>, [number, string]>()
  .mockResolvedValue("/local/1.png");

beforeEach(() => {
  resetDbForTesting();
  jest.resetAllMocks();
  noopDownload.mockResolvedValue("/local/1.png");
});

// ---------------------------------------------------------------------------
// Basic persistence — lessons
// ---------------------------------------------------------------------------

test("1 lesson in response → 1 row inserted in lessons table", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["lesson-1"],
          lessons: [makeLesson("lesson-1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(lessons);
  expect(rows).toHaveLength(1);
});

test("lesson row stores server updated_at, not client clock", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1", { updated_at: "2026-03-15T10:00:00Z" })],
        }),
      ),
    downloadImage: noopDownload,
  });

  const [row] = await db.select({ updatedAt: lessons.updatedAt }).from(lessons);
  expect(row.updatedAt).toBe("2026-03-15T10:00:00Z");
});

test("3 lessons in response → 3 rows in lessons table", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["a", "b", "c"],
          lessons: ["a", "b", "c"].map((id) => makeLesson(id)),
        }),
      ),
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(lessons);
  expect(rows).toHaveLength(3);
});

test("syncAll returns the version string from the server", async () => {
  const db = await initDb();

  const version = await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ version: "2026-06-01T12:00:00Z" })),
    downloadImage: noopDownload,
  });

  expect(version).toBe("2026-06-01T12:00:00Z");
});

test("syncAll returns null version when server has no lessons", async () => {
  const db = await initDb();

  const version = await syncAll(db, null, undefined, {
    getSyncData: () => Promise.resolve(makeSyncResponse({ version: null })),
    downloadImage: noopDownload,
  });

  expect(version).toBeNull();
});

// ---------------------------------------------------------------------------
// Song persistence
// ---------------------------------------------------------------------------

test("lesson with 2 songs → 2 rows in songs table linked to the lesson", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("song-1", "l1"), makeSong("song-2", "l1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  const songRows = await db.select().from(songs);
  expect(songRows).toHaveLength(2);

  const junctionRows = await db.select().from(lessonSongs);
  expect(junctionRows).toHaveLength(2);
  expect(junctionRows.every((r) => r.lessonUuid === "l1")).toBe(true);
});

// ---------------------------------------------------------------------------
// Chord persistence
// ---------------------------------------------------------------------------

test("chord is upserted into chords table", async () => {
  const db = await initDb();
  const chord = makeChord(1, { title: "Am", svg_horizontal: "<svg>v1</svg>" });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { chord_ids: [chord.id] })],
          chords: [chord],
        }),
      ),
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(chords);
  expect(rows).toHaveLength(1);
  expect(rows[0].title).toBe("Am");
});

test("chord shared across two songs appears once in chords table", async () => {
  const db = await initDb();
  const chord = makeChord(7, { title: "Em" });

  await syncAll(db, null, undefined, {
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
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(chords);
  expect(rows).toHaveLength(1);

  const junctionRows = await db.select().from(songChords);
  expect(junctionRows).toHaveLength(2);
});

test("chord SVG is updated on re-sync", async () => {
  const db = await initDb();
  const chord = makeChord(1, { svg_horizontal: "<svg>v1</svg>" });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { chord_ids: [chord.id] })],
          chords: [chord],
        }),
      ),
    downloadImage: noopDownload,
  });

  const updated = { ...chord, svg_horizontal: "<svg>v2</svg>" };

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { chord_ids: [chord.id] })],
          chords: [updated],
        }),
      ),
    downloadImage: noopDownload,
  });

  const [row] = await db.select({ svgHorizontal: chords.svgHorizontal }).from(chords);
  expect(row.svgHorizontal).toBe("<svg>v2</svg>");
});

// ---------------------------------------------------------------------------
// Scheme persistence
// ---------------------------------------------------------------------------

test("scheme image is downloaded and localImagePath written to SQLite", async () => {
  const db = await initDb();
  const downloadImage = jest
    .fn<Promise<string>, [number, string]>()
    .mockResolvedValue("/local/images/42.png");
  const scheme = makeScheme(42, { image: "https://example.com/scheme.png" });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1", { scheme_ids: [scheme.id] })],
          schemes: [scheme],
        }),
      ),
    downloadImage,
  });

  expect(downloadImage).toHaveBeenCalledWith(42, "https://example.com/scheme.png");
  const [row] = await db.select().from(schemes);
  expect(row.localImagePath).toBe("/local/images/42.png");
  expect(row.inscription).toBe("Scheme 42");
  expect(row.height).toBe(200);
  expect(row.width).toBe(300);
});

test("scheme shared across two songs appears once in schemes, twice in song_schemes", async () => {
  const db = await initDb();
  const scheme = makeScheme(10);

  await syncAll(db, null, undefined, {
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
    downloadImage: noopDownload,
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

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1", { title: "Старое название" })],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1", { title: "Новое название" })],
        }),
      ),
    downloadImage: noopDownload,
  });

  const [row] = await db.select({ title: lessons.title }).from(lessons);
  expect(row.title).toBe("Новое название");
});

test("updated lesson keeps only the new songs, removing old ones", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("old-song", "l1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("new-song", "l1")],
        }),
      ),
    downloadImage: noopDownload,
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

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [makeLesson("l1"), makeLesson("l2")],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [],
        }),
      ),
    downloadImage: noopDownload,
  });

  const rows = await db.select({ uuid: lessons.uuid }).from(lessons);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("l1");
});

test("songs of a deleted lesson are also removed", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s1", "l1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ lesson_uuids: [], lessons: [] })),
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(songs);
  expect(rows).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Delta sync — since parameter is forwarded to getSyncData
// ---------------------------------------------------------------------------

test("syncAll passes since to getSyncData", async () => {
  const db = await initDb();
  const getSyncData = jest
    .fn<Promise<SyncLessonsResponse>, [string | null]>()
    .mockResolvedValue(makeSyncResponse());

  await syncAll(db, "2026-05-01T00:00:00Z", undefined, {
    getSyncData,
    downloadImage: noopDownload,
  });

  expect(getSyncData).toHaveBeenCalledWith("2026-05-01T00:00:00Z");
});

test("delta sync with empty lessons list does not create duplicate rows", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, "2026-01-01T00:00:00Z", undefined, {
    getSyncData: () =>
      Promise.resolve(makeSyncResponse({ lesson_uuids: ["l1"], lessons: [] })),
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(lessons);
  expect(rows).toHaveLength(1);
});

// ---------------------------------------------------------------------------
// Crash resilience
// ---------------------------------------------------------------------------

test("retry after crash completes without duplicating already-committed lessons", async () => {
  const db = await initDb();
  const crash = new Error("simulated crash");
  const schemeId = 99;
  jest.useFakeTimers();

  const crashed = syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [makeLesson("l1"), makeLesson("l2")],
          songs: [
            makeSong("s-l1", "l1"),
            makeSong("s-l2", "l2", { scheme_ids: [schemeId] }),
          ],
          schemes: [makeScheme(schemeId, { image: "https://example.com/l2.png" })],
        }),
      ),
    downloadImage: (_id, url) =>
      url.includes("l2") ? Promise.reject(crash) : Promise.resolve("/local/img.png"),
  }).catch((err: unknown) => err);
  await jest.advanceTimersByTimeAsync(4_000);
  jest.useRealTimers();
  expect(await crashed).toBe(crash);

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1", "l2"],
          lessons: [makeLesson("l1"), makeLesson("l2")],
          songs: [
            makeSong("s-l1", "l1"),
            makeSong("s-l2", "l2", { scheme_ids: [schemeId] }),
          ],
          schemes: [makeScheme(schemeId, { image: "https://example.com/l2.png" })],
        }),
      ),
    downloadImage: noopDownload,
  });

  const finalRows = await db.select().from(lessons);
  expect(finalRows).toHaveLength(2);
});

// ---------------------------------------------------------------------------
// song_chords / song_schemes junction cleanup
// ---------------------------------------------------------------------------

test("song_chords rows for removed song are deleted on lesson update", async () => {
  const db = await initDb();
  const chord = makeChord(7, { title: "Em" });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-old", "l1", { chord_ids: [chord.id] })],
          chords: [chord],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-new", "l1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  const junctionRows = await db.select().from(songChords);
  expect(junctionRows).toHaveLength(0);
});

test("song_schemes rows for removed song are deleted on lesson update", async () => {
  const db = await initDb();
  const scheme = makeScheme(5);

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-old", "l1", { scheme_ids: [scheme.id] })],
          schemes: [scheme],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          lesson_uuids: ["l1"],
          lessons: [makeLesson("l1")],
          songs: [makeSong("s-new", "l1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  const junctionRows = await db.select().from(songSchemes);
  expect(junctionRows).toHaveLength(0);
});

// ---------------------------------------------------------------------------
// Course sync — persistence
// ---------------------------------------------------------------------------

test("1 course in response → 1 row inserted in courses table", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["course-1"],
          courses: [makeCourse("course-1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(courses);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("course-1");
});

test("course with 2 lessons → 2 rows in course_lessons table", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
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
    downloadImage: noopDownload,
  });

  const rows = await db.select().from(courseLessons);
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.courseUuid === "c1")).toBe(true);
  const orders = rows.map((r) => r.order).sort((a, b) => a - b);
  expect(orders).toEqual([1, 2]);
});

test("existing course is updated with new title on second sync", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1"],
          courses: [makeCourse("c1", { title: "Старое название" })],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1"],
          courses: [makeCourse("c1", { title: "Новое название" })],
        }),
      ),
    downloadImage: noopDownload,
  });

  const [row] = await db.select({ title: courses.title }).from(courses);
  expect(row.title).toBe("Новое название");
});

test("re-sync replaces course lesson memberships", async () => {
  const db = await initDb();

  await syncAll(db, null, undefined, {
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
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
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
    downloadImage: noopDownload,
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

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1", "c2"],
          courses: [makeCourse("c1"), makeCourse("c2")],
        }),
      ),
    downloadImage: noopDownload,
  });

  await syncAll(db, null, undefined, {
    getSyncData: () =>
      Promise.resolve(
        makeSyncResponse({
          course_uuids: ["c1"],
          courses: [makeCourse("c1")],
        }),
      ),
    downloadImage: noopDownload,
  });

  const rows = await db.select({ uuid: courses.uuid }).from(courses);
  expect(rows).toHaveLength(1);
  expect(rows[0].uuid).toBe("c1");
});

// ---------------------------------------------------------------------------
// defaultDownloadImage — uses real implementation (expo-file-system mocked)
// ---------------------------------------------------------------------------

describe("defaultDownloadImage via syncAll (no downloadImage dep)", () => {
  const fsModule = jest.requireMock("expo-file-system") as any;

  beforeEach(() => {
    const mockDir = { create: jest.fn() };
    fsModule.Directory.mockReturnValue(mockDir);
    fsModule.File.mockImplementation(() => ({}));
    fsModule.File.downloadFileAsync.mockResolvedValue({ uri: "/local/scheme.png" });
  });

  test("downloads scheme with absolute URL unchanged", async () => {
    const db = await initDb();
    const scheme = makeScheme(1, { image: "https://cdn.example.com/scheme.png" });

    await syncAll(db, null, undefined, {
      getSyncData: () => Promise.resolve(makeSyncResponse({ schemes: [scheme] })),
    });

    expect(fsModule.File.downloadFileAsync).toHaveBeenCalledWith(
      "https://cdn.example.com/scheme.png",
      expect.anything(),
      expect.objectContaining({ idempotent: true }),
    );
    const [row] = await db.select().from(schemes);
    expect(row.localImagePath).toBe("/local/scheme.png");
  });

  test("prepends base URL for relative scheme image path", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.test.com";
    const db = await initDb();
    const scheme = makeScheme(2, { image: "/media/scheme-2.png" });

    await syncAll(db, null, undefined, {
      getSyncData: () => Promise.resolve(makeSyncResponse({ schemes: [scheme] })),
    });

    expect(fsModule.File.downloadFileAsync).toHaveBeenCalledWith(
      "https://api.test.com/media/scheme-2.png",
      expect.anything(),
      expect.objectContaining({ idempotent: true }),
    );
    delete process.env.EXPO_PUBLIC_API_URL;
  });
});

describe("scheme image download resilience", () => {
  const fsModule = jest.requireMock("expo-file-system") as any;

  type DownloadOptions = {
    signal: AbortSignal;
    onProgress: () => void;
  };

  function stallUntilAborted(_url: string, _dest: unknown, options: DownloadOptions) {
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("AbortError")));
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    fsModule.Directory.mockReturnValue({ create: jest.fn() });
    fsModule.File.mockImplementation(() => ({}));
    fsModule.File.downloadFileAsync.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("retries a failed image download and completes the sync", async () => {
    const db = await initDb();
    const downloadImage = jest
      .fn()
      .mockRejectedValueOnce(new Error("java.net.SocketTimeoutException: timeout"))
      .mockRejectedValueOnce(new Error("java.net.SocketTimeoutException: timeout"))
      .mockResolvedValueOnce("/local/1.png");

    const result = syncAll(db, null, undefined, {
      getSyncData: () =>
        Promise.resolve(makeSyncResponse({ schemes: [makeScheme(1)] })),
      downloadImage,
    });
    await jest.advanceTimersByTimeAsync(4_000);
    await result;

    expect(downloadImage).toHaveBeenCalledTimes(3);
    const [row] = await db.select().from(schemes);
    expect(row.localImagePath).toBe("/local/1.png");
  });

  test("fails the sync with the last error after three failed attempts", async () => {
    const db = await initDb();
    const downloadImage = jest
      .fn()
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"))
      .mockRejectedValueOnce(new Error("third"));

    const result = syncAll(db, null, undefined, {
      getSyncData: () =>
        Promise.resolve(makeSyncResponse({ schemes: [makeScheme(1)] })),
      downloadImage,
    }).catch((err: unknown) => err);
    await jest.advanceTimersByTimeAsync(4_000);

    expect(await result).toEqual(new Error("third"));
    expect(downloadImage).toHaveBeenCalledTimes(3);
  });

  test("aborts a download that receives no data for 20 seconds", async () => {
    const db = await initDb();
    fsModule.File.downloadFileAsync.mockImplementation(stallUntilAborted);

    const result = syncAll(db, null, undefined, {
      getSyncData: () =>
        Promise.resolve(makeSyncResponse({ schemes: [makeScheme(1)] })),
    }).catch((err: unknown) => err);
    await jest.advanceTimersByTimeAsync(3 * 20_000 + 4_000);

    expect(await result).toBeInstanceOf(RequestTimeoutError);
    expect(fsModule.File.downloadFileAsync).toHaveBeenCalledTimes(3);
  });

  test("keeps a slow download alive while data keeps arriving", async () => {
    const db = await initDb();
    fsModule.File.downloadFileAsync.mockImplementation(
      (_url: string, _dest: unknown, options: DownloadOptions) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new Error("AbortError")),
          );
          const chunks = setInterval(options.onProgress, 15_000);
          setTimeout(() => {
            clearInterval(chunks);
            resolve({ uri: "/local/slow.png" });
          }, 50_000);
        }),
    );

    const result = syncAll(db, null, undefined, {
      getSyncData: () =>
        Promise.resolve(makeSyncResponse({ schemes: [makeScheme(1)] })),
    });
    await jest.advanceTimersByTimeAsync(50_000);
    await result;

    expect(fsModule.File.downloadFileAsync).toHaveBeenCalledTimes(1);
    const [row] = await db.select().from(schemes);
    expect(row.localImagePath).toBe("/local/slow.png");
  });
});

describe("atomic write and progress stages", () => {
  test("a failing write leaves the previously synced content untouched", async () => {
    const db = await initDb();
    await syncAll(db, null, undefined, {
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
      downloadImage: noopDownload,
    });

    const error = await syncAll(db, null, undefined, {
      getSyncData: () =>
        Promise.resolve(
          makeSyncResponse({
            lesson_uuids: ["l1"],
            lessons: [makeLesson("l1", { title: "Новое название" })],
            course_uuids: ["c1"],
            courses: [makeCourse("c1")],
            course_lessons: [makeCourseLesson("c1", "missing-lesson", 1)],
          }),
        ),
      downloadImage: noopDownload,
    }).catch((err: unknown) => err);

    expect((error as Error).message).toBe("FOREIGN KEY constraint failed");

    const [lesson] = await db.select().from(lessons);
    expect(lesson.title).toBe("Старое название");
    const memberships = await db.select().from(courseLessons);
    expect(memberships).toEqual([
      expect.objectContaining({ courseUuid: "c1", lessonUuid: "l1" }),
    ]);
  });

  test("reports each downloaded image, then the saving stage", async () => {
    const db = await initDb();
    const onProgress = jest.fn();

    await syncAll(db, null, onProgress, {
      getSyncData: () =>
        Promise.resolve(makeSyncResponse({ schemes: [makeScheme(1), makeScheme(2)] })),
      downloadImage: noopDownload,
    });

    expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { stage: "downloading", total: 2, completed: 1 },
      { stage: "downloading", total: 2, completed: 2 },
      { stage: "saving" },
    ]);
  });

  test("starts writing only after the saving stage has been acknowledged", async () => {
    const db = await initDb();
    let acknowledgeSaving = () => {};
    const onProgress = (progress: { stage: string }) =>
      progress.stage === "saving"
        ? new Promise<void>((resolve) => {
            acknowledgeSaving = resolve;
          })
        : undefined;

    const result = syncAll(db, null, onProgress, {
      getSyncData: () =>
        Promise.resolve(
          makeSyncResponse({ lesson_uuids: ["l1"], lessons: [makeLesson("l1")] }),
        ),
      downloadImage: noopDownload,
    });
    await new Promise<void>((resolve) => setImmediate(() => resolve()));

    expect(await db.select().from(lessons)).toHaveLength(0);
    acknowledgeSaving();
    await result;
    expect(await db.select().from(lessons)).toHaveLength(1);
  });
});
