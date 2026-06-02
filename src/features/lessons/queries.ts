// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { asc, count, eq } from "drizzle-orm";
import { useMemo } from "react";

import { useProgress } from "@/features/settings";

import { getDb } from "./db";
import { courseLessons, courses, lessons, lessonSongs } from "./schema";

export type CourseLessonRow = {
  lessonUuid: string;
  title: string;
  order: number;
  songCount: number;
};

export async function fetchCourses() {
  return getDb().select().from(courses);
}

export async function fetchCourseLessons(
  courseUuid: string,
): Promise<CourseLessonRow[]> {
  return getDb()
    .select({
      lessonUuid: lessons.uuid,
      title: lessons.title,
      order: courseLessons.order,
      songCount: count(lessonSongs.songUuid),
    })
    .from(courseLessons)
    .innerJoin(lessons, eq(lessons.uuid, courseLessons.lessonUuid))
    .leftJoin(lessonSongs, eq(lessonSongs.lessonUuid, lessons.uuid))
    .where(eq(courseLessons.courseUuid, courseUuid))
    .groupBy(lessons.uuid)
    .orderBy(asc(courseLessons.order));
}

export function useContinueLesson(courseUuid: string) {
  const { progress } = useProgress();

  const query = useQuery({
    queryKey: ["course-lessons", courseUuid],
    queryFn: () => fetchCourseLessons(courseUuid),
    enabled: courseUuid.length > 0,
  });

  const lesson = useMemo(() => {
    if (!query.data) return null;
    return (
      query.data.find((row) => {
        const p = progress[row.lessonUuid];
        return !p || !p.videoViewed || p.completedSongIds.length < row.songCount;
      }) ?? query.data.at(-1)
    );
  }, [query.data, progress]);

  return { ...query, lesson };
}
