// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { LessonProgress } from "@/features/settings";

import type { CourseLessonRow } from "./queries";

export type LessonState = "completed" | "continue" | "in-progress" | "neutral";

export function deriveLessonState(
  lesson: CourseLessonRow,
  progress: LessonProgress | undefined,
  continueLessonUuid: string | null,
): LessonState {
  const videoViewed = progress?.videoViewed ?? false;
  const completedSongs = progress?.completedSongIds.length ?? 0;
  const isCompleted = videoViewed && completedSongs >= lesson.songCount;

  if (isCompleted) return "completed";
  if (lesson.lessonUuid === continueLessonUuid) return "continue";
  if (videoViewed || completedSongs > 0) return "in-progress";
  return "neutral";
}

export function computeCourseProgress(
  lessons: CourseLessonRow[],
  allProgress: Record<string, LessonProgress>,
): { completed: number; total: number; pct: number } {
  if (lessons.length === 0) return { completed: 0, total: 0, pct: 0 };

  const total = lessons.length;
  const completed = lessons.filter((lesson) => {
    const p = allProgress[lesson.lessonUuid];
    return p?.videoViewed === true && p.completedSongIds.length >= lesson.songCount;
  }).length;

  return { completed, total, pct: Math.round((completed / total) * 100) };
}
