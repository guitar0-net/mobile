// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";

import { useProgress } from "@/features/settings";

import { useContinueLesson } from "../queries";
import { CompactCourseCard } from "./compact-course-card";
import { FeaturedCourseCard } from "./featured-course-card";

export type LessonInfo = {
  order: number;
  title: string;
  remainingSongs: number;
  videoRemaining: boolean;
  progressPct: number;
  hasProgress: boolean;
};

type Props = {
  courseUuid: string;
  courseTitle: string;
  variant?: "featured" | "compact";
};

export function CourseContinueCard({
  courseUuid,
  courseTitle,
  variant = "compact",
}: Props) {
  const router = useRouter();
  const { lesson: row } = useContinueLesson(courseUuid);
  const { progress } = useProgress();

  if (!row) return null;

  const lessonProgress = progress[row.lessonUuid];
  const completedSongs = lessonProgress?.completedSongIds.length ?? 0;
  const videoViewed = lessonProgress?.videoViewed ?? false;
  const lesson: LessonInfo = {
    order: row.order,
    title: row.title,
    remainingSongs: row.songCount - completedSongs,
    videoRemaining: !videoViewed,
    progressPct: Math.round(
      ((completedSongs + (videoViewed ? 1 : 0)) / (row.songCount + 1)) * 100,
    ),
    hasProgress: completedSongs > 0 || videoViewed,
  };

  const handlePress = () =>
    router.push(`/lesson/${row.lessonUuid}?courseId=${courseUuid}`);

  return variant === "featured" ? (
    <FeaturedCourseCard
      lesson={lesson}
      courseTitle={courseTitle}
      onPress={handlePress}
    />
  ) : (
    <CompactCourseCard
      lesson={lesson}
      courseTitle={courseTitle}
      onPress={handlePress}
    />
  );
}
