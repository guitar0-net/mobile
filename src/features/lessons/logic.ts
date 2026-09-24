// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { LessonProgress } from "@/features/settings";

import type { CourseLessonRow } from "./queries";

export type LessonState = "completed" | "continue" | "in-progress" | "neutral";

/** Lesson № 0 is an optional introduction: never suggested as next, not counted in course progress. */
export function isIntroLesson(lesson: { order: number }): boolean {
  return lesson.order === 0;
}

export function isLessonCompleted(
  lesson: { songCount: number },
  progress: LessonProgress | undefined,
): boolean {
  const videoViewed = progress?.videoViewed ?? false;
  const completedSongs = progress?.completedSongIds.length ?? 0;
  return videoViewed && completedSongs >= lesson.songCount;
}

export function deriveLessonState(
  lesson: CourseLessonRow,
  progress: LessonProgress | undefined,
  continueLessonUuid: string | null,
): LessonState {
  if (isLessonCompleted(lesson, progress)) return "completed";
  if (lesson.lessonUuid === continueLessonUuid) return "continue";
  if (progress?.videoViewed || (progress?.completedSongIds.length ?? 0) > 0) {
    return "in-progress";
  }
  return "neutral";
}

export function computeCourseProgress(
  lessons: CourseLessonRow[],
  allProgress: Record<string, LessonProgress>,
): { completed: number; total: number; pct: number } {
  const countedLessons = lessons.filter((lesson) => !isIntroLesson(lesson));
  if (countedLessons.length === 0) return { completed: 0, total: 0, pct: 0 };

  const total = countedLessons.length;
  const completed = countedLessons.filter((lesson) =>
    isLessonCompleted(lesson, allProgress[lesson.lessonUuid]),
  ).length;

  return { completed, total, pct: Math.round((completed / total) * 100) };
}
