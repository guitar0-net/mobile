// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";

import { resetDbForTesting } from "./__tests__/testing";
import { initDb } from "./db";
import { fetchCourseLessons, useContinueLesson } from "./queries";
import { courseLessons, courses, lessons, lessonSongs, songs } from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
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
