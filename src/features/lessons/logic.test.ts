// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { LessonProgress } from "@/features/settings";

import { computeCourseProgress, deriveLessonState } from "./logic";
import type { CourseLessonRow } from "./queries";

function row(
  lessonUuid: string,
  songCount: number,
  duration: number | null = null,
): CourseLessonRow {
  return {
    lessonUuid,
    title: `L-${lessonUuid}`,
    order: 1,
    songCount,
    duration,
    songs: [],
  };
}

function prog(videoViewed: boolean, completedSongIds: string[]): LessonProgress {
  return { videoViewed, completedSongIds };
}

// ---------------------------------------------------------------------------
// deriveLessonState
// ---------------------------------------------------------------------------

describe("deriveLessonState", () => {
  test("neutral when no progress and not the continue target", () => {
    expect(deriveLessonState(row("l1", 2), undefined, null)).toBe("neutral");
  });

  test("neutral when no progress and a different lesson is the continue target", () => {
    expect(deriveLessonState(row("l1", 2), undefined, "l2")).toBe("neutral");
  });

  test("continue when lesson is the continue target with no progress", () => {
    expect(deriveLessonState(row("l1", 2), undefined, "l1")).toBe("continue");
  });

  test("continue when lesson is the continue target with partial progress", () => {
    expect(deriveLessonState(row("l1", 2), prog(false, ["s1"]), "l1")).toBe("continue");
  });

  test("continue when video viewed but songs remain and lesson is the continue target", () => {
    expect(deriveLessonState(row("l1", 2), prog(true, []), "l1")).toBe("continue");
  });

  test("completed when video viewed and all songs completed", () => {
    expect(deriveLessonState(row("l1", 2), prog(true, ["s1", "s2"]), null)).toBe(
      "completed",
    );
  });

  test("completed even when it is also the continue target", () => {
    expect(deriveLessonState(row("l1", 2), prog(true, ["s1", "s2"]), "l1")).toBe(
      "completed",
    );
  });

  test("completed when songCount is 0 and video viewed", () => {
    expect(deriveLessonState(row("l1", 0), prog(true, []), null)).toBe("completed");
  });

  test("not completed when video viewed but zero songs done (songCount > 0)", () => {
    expect(deriveLessonState(row("l1", 2), prog(true, []), "l2")).toBe("in-progress");
  });

  test("not completed when all songs done but video not viewed", () => {
    expect(deriveLessonState(row("l1", 2), prog(false, ["s1", "s2"]), "l2")).toBe(
      "in-progress",
    );
  });

  test("in-progress when video viewed but partial songs and not continue target", () => {
    expect(deriveLessonState(row("l1", 3), prog(true, ["s1"]), "l2")).toBe(
      "in-progress",
    );
  });

  test("in-progress when only video viewed and not the continue target", () => {
    expect(deriveLessonState(row("l1", 2), prog(true, []), "l2")).toBe("in-progress");
  });

  test("in-progress when only some songs done and not the continue target", () => {
    expect(deriveLessonState(row("l1", 2), prog(false, ["s1"]), "l2")).toBe(
      "in-progress",
    );
  });
});

// ---------------------------------------------------------------------------
// computeCourseProgress
// ---------------------------------------------------------------------------

describe("computeCourseProgress", () => {
  test("returns zeros for an empty lesson list", () => {
    expect(computeCourseProgress([], {})).toEqual({ completed: 0, total: 0, pct: 0 });
  });

  test("no lessons completed when progress is empty", () => {
    const lessons = [row("l1", 2), row("l2", 1)];
    expect(computeCourseProgress(lessons, {})).toEqual({
      completed: 0,
      total: 2,
      pct: 0,
    });
  });

  test("counts only fully completed lessons (video viewed + all songs)", () => {
    const lessons = [row("l1", 2), row("l2", 1), row("l3", 1)];
    const allProgress = {
      l1: prog(true, ["s1", "s2"]),
      l2: prog(false, ["s1"]),
      l3: prog(true, ["s1"]),
    };
    expect(computeCourseProgress(lessons, allProgress)).toEqual({
      completed: 2,
      total: 3,
      pct: 67,
    });
  });

  test("pct is 100 when all lessons are completed", () => {
    const lessons = [row("l1", 1), row("l2", 0)];
    const allProgress = {
      l1: prog(true, ["s1"]),
      l2: prog(true, []),
    };
    expect(computeCourseProgress(lessons, allProgress)).toEqual({
      completed: 2,
      total: 2,
      pct: 100,
    });
  });

  test("does not count video-viewed-only as completed when songCount > 0", () => {
    const lessons = [row("l1", 2)];
    const allProgress = { l1: prog(true, []) };
    expect(computeCourseProgress(lessons, allProgress)).toEqual({
      completed: 0,
      total: 1,
      pct: 0,
    });
  });
});
