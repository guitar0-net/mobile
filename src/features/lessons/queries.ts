// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { and, asc, count, eq } from "drizzle-orm";
import { useMemo } from "react";

import { useProgress } from "@/features/settings";

import { getDb } from "./db";
import { courseLessons, courses, lessons, lessonSongs, songs } from "./schema";
import type { VideoDownloadStatus } from "./schema";

export type CourseLessonRow = {
  lessonUuid: string;
  title: string;
  order: number;
  songCount: number;
  duration: number | null;
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
      duration: lessons.duration,
    })
    .from(courseLessons)
    .innerJoin(lessons, eq(lessons.uuid, courseLessons.lessonUuid))
    .leftJoin(lessonSongs, eq(lessonSongs.lessonUuid, lessons.uuid))
    .where(eq(courseLessons.courseUuid, courseUuid))
    .groupBy(lessons.uuid)
    .orderBy(asc(courseLessons.order));
}

export type LessonDetailSong = {
  uuid: string;
  title: string;
  metronome: number;
};

export type LessonDetailRow = {
  uuid: string;
  title: string;
  description: string | null;
  videoUrl: string;
  duration: number | null;
  localVideoPath: string | null;
  videoDownloadStatus: VideoDownloadStatus;
  courseTitle: string;
  lessonOrder: number;
  totalLessonsInCourse: number;
  songs: LessonDetailSong[];
};

export async function fetchLessonDetail(
  lessonUuid: string,
  courseUuid: string,
): Promise<LessonDetailRow | null> {
  const db = getDb();

  const [lesson] = await db
    .select({
      uuid: lessons.uuid,
      title: lessons.title,
      description: lessons.description,
      videoUrl: lessons.videoUrl,
      duration: lessons.duration,
      localVideoPath: lessons.localVideoPath,
      videoDownloadStatus: lessons.videoDownloadStatus,
      courseTitle: courses.title,
      lessonOrder: courseLessons.order,
    })
    .from(lessons)
    .innerJoin(
      courseLessons,
      and(
        eq(courseLessons.lessonUuid, lessons.uuid),
        eq(courseLessons.courseUuid, courseUuid),
      ),
    )
    .innerJoin(courses, eq(courses.uuid, courseLessons.courseUuid))
    .where(eq(lessons.uuid, lessonUuid));

  if (!lesson) return null;

  const [{ total }] = await db
    .select({ total: count() })
    .from(courseLessons)
    .where(eq(courseLessons.courseUuid, courseUuid));

  const songRows = await db
    .select({
      uuid: songs.uuid,
      title: songs.title,
      metronome: songs.metronome,
    })
    .from(songs)
    .innerJoin(lessonSongs, eq(lessonSongs.songUuid, songs.uuid))
    .where(eq(lessonSongs.lessonUuid, lessonUuid));

  return { ...lesson, totalLessonsInCourse: total, songs: songRows };
}

export function useLessonDetail(lessonUuid: string, courseUuid: string) {
  return useQuery({
    queryKey: ["lesson-detail", lessonUuid, courseUuid],
    queryFn: () => fetchLessonDetail(lessonUuid, courseUuid),
    enabled: lessonUuid.length > 0 && courseUuid.length > 0,
  });
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
