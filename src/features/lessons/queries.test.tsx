// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import {
  courseLessons,
  courses,
  initDb,
  lessonAdditionLessons,
  lessons,
  lessonSongs,
  songs,
} from "@/lib/db";
import { createTestQueryClient } from "@/lib/network/__tests__/testing";
import { queryClient } from "@/lib/network/query-client";

import { resetDbForTesting } from "./__tests__/testing";
import {
  fetchAllLessonSongCounts,
  fetchCourses,
  fetchCourseLessons,
  fetchLessonLinks,
  fetchLessonDetail,
  fetchSongIdsByLesson,
  invalidateContentQueries,
  listDownloadedVideos,
  useAdjacentLessons,
  useCompletedLessonsCount,
  useContinueLesson,
  useDownloadedVideos,
  useFavoriteLessons,
  useLessonDetail,
} from "./queries";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetInfoAsync = jest.fn();

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

async function seedCourse() {
  const db = await initDb();

  await db.insert(courses).values({
    uuid: "course-1",
    title: "Beginner",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  });
  await db.insert(lessons).values([
    {
      uuid: "lesson-1",
      title: "Open chords",
      videoUrl: "https://example.com/v1.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      uuid: "lesson-2",
      title: "Barre chords",
      videoUrl: "https://example.com/v2.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ]);
  await db.insert(courseLessons).values([
    { courseUuid: "course-1", lessonUuid: "lesson-1", order: 1 },
    { courseUuid: "course-1", lessonUuid: "lesson-2", order: 2 },
  ]);
  await db.insert(songs).values([
    { uuid: "song-1", title: "Song A", text: "..." },
    { uuid: "song-2", title: "Song B", text: "..." },
  ]);
  await db.insert(lessonSongs).values([
    { lessonUuid: "lesson-1", songUuid: "song-1" },
    { lessonUuid: "lesson-1", songUuid: "song-2" },
  ]);
}

beforeEach(() => {
  resetDbForTesting();
  resetSettingsForTesting();
  mockGetInfoAsync.mockReset();
});

// ---------------------------------------------------------------------------
// fetchCourses
// ---------------------------------------------------------------------------

describe("fetchCourses", () => {
  test("returns empty array when no courses exist", async () => {
    await initDb();
    expect(await fetchCourses()).toEqual([]);
  });

  test("returns inserted courses", async () => {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-1",
      title: "Beginner",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const rows = await fetchCourses();
    expect(rows).toHaveLength(1);
    expect(rows[0].uuid).toBe("course-1");
  });
});

// ---------------------------------------------------------------------------
// fetchCourseLessons
// ---------------------------------------------------------------------------

describe("fetchCourseLessons", () => {
  test("returns empty array when course has no lessons", async () => {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-1",
      title: "Beginner",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    expect(await fetchCourseLessons("course-1")).toEqual([]);
  });

  test("returns lessons ordered by the order field", async () => {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-1",
      title: "Beginner",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values([
      {
        uuid: "lesson-a",
        title: "Second",
        videoUrl: "https://example.com/v.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        uuid: "lesson-b",
        title: "First",
        videoUrl: "https://example.com/v.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    await db.insert(courseLessons).values([
      { courseUuid: "course-1", lessonUuid: "lesson-a", order: 2 },
      { courseUuid: "course-1", lessonUuid: "lesson-b", order: 1 },
    ]);

    const rows = await fetchCourseLessons("course-1");
    expect(rows.map((r) => r.lessonUuid)).toEqual(["lesson-b", "lesson-a"]);
  });

  test("songCount is 0 for a lesson with no songs", async () => {
    await seedCourse();

    const rows = await fetchCourseLessons("course-1");
    expect(rows.find((r) => r.lessonUuid === "lesson-2")?.songCount).toBe(0);
  });

  test("songCount reflects the number of songs linked to the lesson", async () => {
    await seedCourse();

    const rows = await fetchCourseLessons("course-1");
    expect(rows.find((r) => r.lessonUuid === "lesson-1")?.songCount).toBe(2);
  });

  test("returns duration from the lessons table", async () => {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-1",
      title: "Beginner",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values([
      {
        uuid: "lesson-d1",
        title: "With duration",
        videoUrl: "https://example.com/v.mp4",
        duration: 600,
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        uuid: "lesson-d2",
        title: "No duration",
        videoUrl: "https://example.com/v.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    await db.insert(courseLessons).values([
      { courseUuid: "course-1", lessonUuid: "lesson-d1", order: 1 },
      { courseUuid: "course-1", lessonUuid: "lesson-d2", order: 2 },
    ]);

    const rows = await fetchCourseLessons("course-1");
    expect(rows.find((r) => r.lessonUuid === "lesson-d1")?.duration).toBe(600);
    expect(rows.find((r) => r.lessonUuid === "lesson-d2")?.duration).toBeNull();
  });

  test("songs array contains titles and uuids for linked songs", async () => {
    await seedCourse();

    const rows = await fetchCourseLessons("course-1");
    const lesson1 = rows.find((r) => r.lessonUuid === "lesson-1");
    expect(lesson1?.songs).toHaveLength(2);
    expect(lesson1?.songs).toEqual(
      expect.arrayContaining([
        { uuid: "song-1", title: "Song A" },
        { uuid: "song-2", title: "Song B" },
      ]),
    );
  });

  test("songs array is empty for a lesson with no songs", async () => {
    await seedCourse();

    const rows = await fetchCourseLessons("course-1");
    expect(rows.find((r) => r.lessonUuid === "lesson-2")?.songs).toEqual([]);
  });

  test("does not include lessons from other courses", async () => {
    await seedCourse();
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-2",
      title: "Advanced",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values({
      uuid: "lesson-x",
      title: "Advanced",
      videoUrl: "https://example.com/vx.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(courseLessons).values({
      courseUuid: "course-2",
      lessonUuid: "lesson-x",
      order: 1,
    });

    const rows = await fetchCourseLessons("course-1");
    expect(rows.every((r) => r.lessonUuid !== "lesson-x")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// fetchAllLessonSongCounts
// ---------------------------------------------------------------------------

describe("fetchAllLessonSongCounts", () => {
  test("returns every lesson's song count regardless of course", async () => {
    await seedCourse();

    const rows = await fetchAllLessonSongCounts();

    expect(rows).toEqual(
      expect.arrayContaining([
        { lessonUuid: "lesson-1", songCount: 2 },
        { lessonUuid: "lesson-2", songCount: 0 },
      ]),
    );
    expect(rows).toHaveLength(2);
  });

  test("counts a lesson only once even when it belongs to two courses", async () => {
    await seedCourse();
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-2",
      title: "Advanced",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(courseLessons).values({
      courseUuid: "course-2",
      lessonUuid: "lesson-1",
      order: 1,
    });

    const rows = await fetchAllLessonSongCounts();
    expect(rows.filter((r) => r.lessonUuid === "lesson-1")).toHaveLength(1);
  });

  test("includes a lesson that belongs to no course", async () => {
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "orphan-lesson",
      title: "Orphan",
      videoUrl: "https://example.com/v.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });

    const rows = await fetchAllLessonSongCounts();
    expect(rows).toEqual([{ lessonUuid: "orphan-lesson", songCount: 0 }]);
  });
});

// ---------------------------------------------------------------------------
// useCompletedLessonsCount
// ---------------------------------------------------------------------------

describe("useCompletedLessonsCount", () => {
  test("is 0 before the query resolves and when nothing is completed", async () => {
    await seedCourse();
    const { result } = renderHook(() => useCompletedLessonsCount(), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(0));
  });

  test("counts only fully completed lessons across all courses", async () => {
    await seedCourse();
    useSettingsStore.setState((s) => ({
      progress: {
        ...s.progress,
        "lesson-1": { videoViewed: true, completedSongIds: ["song-1", "song-2"] },
        "lesson-2": { videoViewed: false, completedSongIds: [] },
      },
    }));

    const { result } = renderHook(() => useCompletedLessonsCount(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(1));
  });

  test("updates reactively as progress changes", async () => {
    await seedCourse();
    const { result } = renderHook(() => useCompletedLessonsCount(), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current).toBe(0));

    act(() => {
      useSettingsStore.setState((s) => ({
        progress: {
          ...s.progress,
          "lesson-2": { videoViewed: true, completedSongIds: [] },
        },
      }));
    });

    await waitFor(() => expect(result.current).toBe(1));
  });
});

// ---------------------------------------------------------------------------
// useContinueLesson
// ---------------------------------------------------------------------------

describe("useContinueLesson", () => {
  test("lesson is null before query resolves", async () => {
    await seedCourse();
    const { result } = renderHook(() => useContinueLesson("course-1"), {
      wrapper: makeWrapper(),
    });

    expect(result.current.lesson).toBeNull();
  });

  test("returns the first lesson when there is no progress", async () => {
    await seedCourse();
    const { result } = renderHook(() => useContinueLesson("course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.lesson?.lessonUuid).toBe("lesson-1");
  });

  test("skips a fully completed lesson and returns the next one", async () => {
    await seedCourse();
    useSettingsStore.setState((s) => ({
      progress: {
        ...s.progress,
        "lesson-1": { videoViewed: true, completedSongIds: ["song-1", "song-2"] },
      },
    }));

    const { result } = renderHook(() => useContinueLesson("course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.lesson?.lessonUuid).toBe("lesson-2");
  });

  test("returns the last lesson when all lessons are complete", async () => {
    await seedCourse();
    useSettingsStore.setState((s) => ({
      progress: {
        ...s.progress,
        "lesson-1": { videoViewed: true, completedSongIds: ["song-1", "song-2"] },
        "lesson-2": { videoViewed: true, completedSongIds: [] },
      },
    }));

    const { result } = renderHook(() => useContinueLesson("course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.lesson?.lessonUuid).toBe("lesson-2");
  });

  test("skips the unwatched intro lesson (order 0)", async () => {
    await seedCourse();
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "lesson-0",
      title: "Intro",
      videoUrl: "https://example.com/v0.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db
      .insert(courseLessons)
      .values({ courseUuid: "course-1", lessonUuid: "lesson-0", order: 0 });

    const { result } = renderHook(() => useContinueLesson("course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.lesson?.lessonUuid).toBe("lesson-1");
  });

  test("lesson updates reactively when progress changes", async () => {
    await seedCourse();
    const { result } = renderHook(() => useContinueLesson("course-1"), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.lesson?.lessonUuid).toBe("lesson-1");

    act(() => {
      useSettingsStore.setState((s) => ({
        progress: {
          ...s.progress,
          "lesson-1": { videoViewed: true, completedSongIds: ["song-1", "song-2"] },
        },
      }));
    });

    await waitFor(() => {
      expect(result.current.lesson?.lessonUuid).toBe("lesson-2");
    });
  });
});

// ---------------------------------------------------------------------------
// fetchLessonDetail
// ---------------------------------------------------------------------------

describe("fetchLessonDetail", () => {
  async function seedLessonDetail() {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-1",
      title: "Guitar Basics",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values([
      {
        uuid: "lesson-1",
        title: "Introduction",
        description: "Welcome to guitar",
        videoUrl: "https://example.com/v1.mp4",
        duration: 874,
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        uuid: "lesson-2",
        title: "Open Chords",
        videoUrl: "https://example.com/v2.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    await db.insert(courseLessons).values([
      { courseUuid: "course-1", lessonUuid: "lesson-1", order: 1 },
      { courseUuid: "course-1", lessonUuid: "lesson-2", order: 2 },
    ]);
    await db.insert(songs).values([
      { uuid: "song-1", title: "Am", text: "...", metronome: 120 },
      { uuid: "song-2", title: "Em", text: "...", metronome: 0 },
    ]);
    await db.insert(lessonSongs).values([
      { lessonUuid: "lesson-1", songUuid: "song-1" },
      { lessonUuid: "lesson-1", songUuid: "song-2" },
    ]);
  }

  test("returns correct courseTitle, lessonOrder, and totalLessonsInCourse", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-2", "course-1");
    expect(result).toMatchObject({
      courseTitle: "Guitar Basics",
      lessonOrder: 2,
      totalLessonsInCourse: 2,
    });
  });

  test("lessonOrder is 1-based", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-1", "course-1");
    expect(result?.lessonOrder).toBe(1);
  });

  test("returns songs array with uuid, title, metronome", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-1", "course-1");
    expect(result?.songs).toHaveLength(2);
    expect(result?.songs).toEqual(
      expect.arrayContaining([
        { uuid: "song-1", title: "Am", metronome: 120 },
        { uuid: "song-2", title: "Em", metronome: 0 },
      ]),
    );
  });

  test("includes songs with metronome = 0", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-1", "course-1");
    expect(result?.songs.some((s) => s.metronome === 0)).toBe(true);
  });

  test("returns null for duration when not set", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-2", "course-1");
    expect(result?.duration).toBeNull();
  });

  test("returns null for localVideoPath when not set", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-1", "course-1");
    expect(result?.localVideoPath).toBeNull();
  });

  test("returns null when lesson does not belong to the given course", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-1", "wrong-course");
    expect(result).toBeNull();
  });

  test("converts embed YouTube URL to watch URL", async () => {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-yt",
      title: "YT Course",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values({
      uuid: "lesson-yt",
      title: "YT Lesson",
      videoUrl: "https://www.youtube.com/embed/SifxRnzo_hc",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(courseLessons).values({
      courseUuid: "course-yt",
      lessonUuid: "lesson-yt",
      order: 1,
    });

    const result = await fetchLessonDetail("lesson-yt", "course-yt");
    expect(result?.videoUrl).toBe("https://www.youtube.com/watch?v=SifxRnzo_hc");
  });

  test("returns addition lessons with the course they open in and their song count", async () => {
    await seedLessonDetail();
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-songs",
      title: "Song breakdowns",
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
    });
    await db.insert(lessons).values({
      uuid: "breakdown-1",
      title: "Kino - Blood type",
      videoUrl: "https://example.com/b1.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db
      .insert(courseLessons)
      .values({ courseUuid: "course-songs", lessonUuid: "breakdown-1", order: 4 });
    await db
      .insert(lessonAdditionLessons)
      .values({ lessonUuid: "lesson-1", additionLessonUuid: "breakdown-1" });
    await db
      .insert(lessonSongs)
      .values({ lessonUuid: "breakdown-1", songUuid: "song-1" });

    const result = await fetchLessonDetail("lesson-1", "course-1");
    expect(result?.additionLessons).toEqual([
      {
        lessonUuid: "breakdown-1",
        title: "Kino - Blood type",
        courseUuid: "course-songs",
        courseTitle: "Song breakdowns",
        order: 4,
        totalInCourse: 1,
        songCount: 1,
      },
    ]);
  });

  test("returns no addition lessons when the lesson has none", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-2", "course-1");
    expect(result?.additionLessons).toEqual([]);
  });

  test("leaves non-YouTube videoUrl unchanged", async () => {
    await seedLessonDetail();
    const result = await fetchLessonDetail("lesson-1", "course-1");
    expect(result?.videoUrl).toBe("https://example.com/v1.mp4");
  });
});

// ---------------------------------------------------------------------------
// useLessonDetail
// ---------------------------------------------------------------------------

describe("useLessonDetail", () => {
  async function seedLessonDetailForHook() {
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-1",
      title: "Guitar Basics",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessons).values({
      uuid: "lesson-1",
      title: "Introduction",
      videoUrl: "https://example.com/v.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(courseLessons).values({
      courseUuid: "course-1",
      lessonUuid: "lesson-1",
      order: 1,
    });
  }

  test("returns lesson detail after query resolves", async () => {
    await seedLessonDetailForHook();
    const { result } = renderHook(() => useLessonDetail("lesson-1", "course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.uuid).toBe("lesson-1");
    expect(result.current.data?.courseTitle).toBe("Guitar Basics");
  });

  test("is disabled when lessonUuid is empty", () => {
    const { result } = renderHook(() => useLessonDetail("", "course-1"), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

// ---------------------------------------------------------------------------
// listDownloadedVideos
// ---------------------------------------------------------------------------

describe("listDownloadedVideos", () => {
  async function seedLessons() {
    const db = await initDb();
    await db.insert(lessons).values([
      {
        uuid: "lesson-downloaded-1",
        title: "Open chords",
        videoUrl: "https://example.com/v1.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
        videoDownloadStatus: "downloaded",
        localVideoPath: "/mock/documents/videos/lesson-downloaded-1.mp4",
      },
      {
        uuid: "lesson-downloaded-2",
        title: "Barre chords",
        videoUrl: "https://example.com/v2.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
        videoDownloadStatus: "downloaded",
        localVideoPath: "/mock/documents/videos/lesson-downloaded-2.mp4",
      },
      {
        uuid: "lesson-idle",
        title: "Not downloaded",
        videoUrl: "https://example.com/v3.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
        videoDownloadStatus: "idle",
      },
      {
        uuid: "lesson-failed",
        title: "Failed download",
        videoUrl: "https://example.com/v4.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
        videoDownloadStatus: "failed",
      },
      {
        uuid: "lesson-downloading",
        title: "In progress",
        videoUrl: "https://example.com/v5.mp4",
        updatedAt: "2026-01-01T00:00:00Z",
        videoDownloadStatus: "downloading",
      },
    ]);
  }

  test("returns only lessons with videoDownloadStatus 'downloaded', with title and size", async () => {
    await seedLessons();
    mockGetInfoAsync.mockImplementation(async (uri: string) => ({
      exists: true,
      uri,
      size: uri.includes("lesson-downloaded-1") ? 1_000_000 : 2_000_000,
    }));

    const result = await listDownloadedVideos();

    expect(result).toHaveLength(2);
    expect(result).toEqual(
      expect.arrayContaining([
        {
          lessonUuid: "lesson-downloaded-1",
          title: "Open chords",
          sizeBytes: 1_000_000,
        },
        {
          lessonUuid: "lesson-downloaded-2",
          title: "Barre chords",
          sizeBytes: 2_000_000,
        },
      ]),
    );
  });

  test("omits a downloaded row whose file no longer exists on disk", async () => {
    await seedLessons();
    mockGetInfoAsync.mockImplementation(async (uri: string) => ({
      exists: !uri.includes("lesson-downloaded-2"),
      uri,
      size: 1_000_000,
    }));

    const result = await listDownloadedVideos();

    expect(result.map((r) => r.lessonUuid)).toEqual(["lesson-downloaded-1"]);
  });

  test("returns an empty array when no lessons are downloaded", async () => {
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "lesson-idle",
      title: "Not downloaded",
      videoUrl: "https://example.com/v.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
      videoDownloadStatus: "idle",
    });

    expect(await listDownloadedVideos()).toEqual([]);
    expect(mockGetInfoAsync).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// useDownloadedVideos
// ---------------------------------------------------------------------------

describe("useDownloadedVideos", () => {
  test("exposes the aggregated list once the query resolves", async () => {
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "lesson-downloaded-1",
      title: "Open chords",
      videoUrl: "https://example.com/v1.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
      videoDownloadStatus: "downloaded",
      localVideoPath: "/mock/documents/videos/lesson-downloaded-1.mp4",
    });
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 5_000_000 });

    const { result } = renderHook(() => useDownloadedVideos(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { lessonUuid: "lesson-downloaded-1", title: "Open chords", sizeBytes: 5_000_000 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// fetchLessonLinks
// ---------------------------------------------------------------------------

describe("fetchLessonLinks", () => {
  test("returns an empty array without querying when given no uuids", async () => {
    await initDb();
    expect(await fetchLessonLinks([])).toEqual([]);
  });

  test("returns lesson rows with course title and total lessons in course", async () => {
    await seedCourse();

    const rows = await fetchLessonLinks(["lesson-1"]);
    expect(rows).toEqual([
      {
        lessonUuid: "lesson-1",
        title: "Open chords",
        courseUuid: "course-1",
        courseTitle: "Beginner",
        order: 1,
        totalInCourse: 2,
      },
    ]);
  });

  test("omits a favorite uuid that no longer matches any lesson", async () => {
    await seedCourse();

    const rows = await fetchLessonLinks(["lesson-1", "deleted-lesson"]);
    expect(rows.map((r) => r.lessonUuid)).toEqual(["lesson-1"]);
  });

  test("resolves to a single row when a lesson belongs to two courses", async () => {
    await seedCourse();
    const db = await initDb();
    await db.insert(courses).values({
      uuid: "course-2",
      title: "Advanced",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(courseLessons).values({
      courseUuid: "course-2",
      lessonUuid: "lesson-1",
      order: 1,
    });

    const rows = await fetchLessonLinks(["lesson-1"]);
    expect(rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// useFavoriteLessons
// ---------------------------------------------------------------------------

describe("useFavoriteLessons", () => {
  test("returns an empty list when there are no favorites", () => {
    const { result } = renderHook(() => useFavoriteLessons(), {
      wrapper: makeWrapper(),
    });
    expect(result.current.lessons).toEqual([]);
  });

  test("returns favorited lessons ordered most-recently-added first", async () => {
    await seedCourse();
    useSettingsStore.setState({ favorites: ["lesson-1", "lesson-2"] });

    const { result } = renderHook(() => useFavoriteLessons(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(result.current.lessons.map((l) => l.lessonUuid)).toEqual([
        "lesson-2",
        "lesson-1",
      ]),
    );
  });

  test("filters out favorite uuids that no longer exist in the database", async () => {
    await seedCourse();
    useSettingsStore.setState({ favorites: ["lesson-1", "deleted-lesson"] });

    const { result } = renderHook(() => useFavoriteLessons(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() =>
      expect(result.current.lessons.map((l) => l.lessonUuid)).toEqual(["lesson-1"]),
    );
  });

  test("limit truncates the returned list to the given count", async () => {
    await seedCourse();
    useSettingsStore.setState({ favorites: ["lesson-1", "lesson-2"] });

    const { result } = renderHook(() => useFavoriteLessons(1), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.lessons).toHaveLength(1));
    expect(result.current.lessons[0].lessonUuid).toBe("lesson-2");
  });
});

describe("fetchSongIdsByLesson", () => {
  test("returns the songs of each requested lesson", async () => {
    await seedCourse();

    expect(await fetchSongIdsByLesson(["lesson-1"])).toEqual({
      "lesson-1": ["song-1", "song-2"],
    });
  });

  test("returns an empty list for a lesson that teaches no songs", async () => {
    await seedCourse();

    expect(await fetchSongIdsByLesson(["lesson-2"])).toEqual({ "lesson-2": [] });
  });

  test("omits lessons the local content does not have", async () => {
    await seedCourse();

    const byLesson = await fetchSongIdsByLesson(["lesson-1", "missing-lesson"]);

    expect(Object.keys(byLesson)).toEqual(["lesson-1"]);
  });
});

// ---------------------------------------------------------------------------
// invalidateContentQueries
// ---------------------------------------------------------------------------

describe("invalidateContentQueries", () => {
  afterEach(() => {
    queryClient.clear();
  });

  test("marks lesson content stale and leaves network and activity data alone", () => {
    const keys = [
      ["courses"],
      ["course-lessons", "c1"],
      ["lesson-detail", "l1", "c1"],
      ["chords", "count"],
      ["migration", "review-sections"],
      ["announcements", "list"],
      ["activity", "timeline"],
    ];
    for (const key of keys) queryClient.setQueryData(key, "cached");

    invalidateContentQueries();

    const stale = keys.filter((key) => queryClient.getQueryState(key)?.isInvalidated);
    expect(stale).toEqual([
      ["courses"],
      ["course-lessons", "c1"],
      ["lesson-detail", "l1", "c1"],
      ["chords", "count"],
      ["migration", "review-sections"],
    ]);
  });
});

// ---------------------------------------------------------------------------
// useAdjacentLessons
// ---------------------------------------------------------------------------

describe("useAdjacentLessons", () => {
  test("the first lesson has only a next neighbour", async () => {
    await seedCourse();
    const { result } = renderHook(() => useAdjacentLessons("lesson-1", "course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.next?.lessonUuid).toBe("lesson-2"));
    expect(result.current.previous).toBeNull();
  });

  test("the last lesson has only a previous neighbour", async () => {
    await seedCourse();
    const { result } = renderHook(() => useAdjacentLessons("lesson-2", "course-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.previous?.lessonUuid).toBe("lesson-1"));
    expect(result.current.next).toBeNull();
  });

  test("a lesson outside the course has no neighbours", async () => {
    await seedCourse();
    const client = createTestQueryClient();
    const { result } = renderHook(() => useAdjacentLessons("lesson-x", "course-1"), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() =>
      expect(client.getQueryData(["course-lessons", "course-1"])).toHaveLength(2),
    );
    expect(result.current).toEqual({ previous: null, next: null });
  });

  test("loads the neighbour's detail ahead of time", async () => {
    await seedCourse();
    const client = createTestQueryClient();
    renderHook(() => useAdjacentLessons("lesson-1", "course-1"), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() =>
      expect(client.getQueryData(["lesson-detail", "lesson-2", "course-1"])).toEqual(
        expect.objectContaining({ uuid: "lesson-2", title: "Barre chords" }),
      ),
    );
  });
});
