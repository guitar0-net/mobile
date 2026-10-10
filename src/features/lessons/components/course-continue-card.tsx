// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";

import { useProgress } from "@/features/settings";

import { remainingLessonSteps } from "../logic";
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
  const { lesson: row, data } = useContinueLesson(courseUuid);
  const { progress } = useProgress();

  if (!row || !data) return null;

  const { remainingSongs, videoRemaining } = remainingLessonSteps(
    row,
    progress[row.lessonUuid],
  );
  const totalSteps = row.songCount + 1;
  const remainingSteps = remainingSongs + (videoRemaining ? 1 : 0);
  const lesson: LessonInfo = {
    order: row.order,
    title: row.title,
    remainingSongs,
    videoRemaining,
    progressPct: Math.round(((totalSteps - remainingSteps) / totalSteps) * 100),
    hasProgress: remainingSteps < totalSteps,
  };

  const handlePress = () =>
    router.push(
      `/lesson/${row.lessonUuid}?courseId=${courseUuid}&order=${row.order}&total=${data.length}`,
    );

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
