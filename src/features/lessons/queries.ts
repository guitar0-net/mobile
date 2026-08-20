// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import * as FileSystem from "expo-file-system/legacy";
import { useMemo } from "react";

import { useFavorites, useProgress } from "@/features/settings";
import { getDb, courseLessons, courses, lessons, lessonSongs, songs } from "@/lib/db";
import type { VideoDownloadStatus } from "@/lib/db";

import { isLessonCompleted } from "./logic";

export type CourseLessonRow = {
  lessonUuid: string;
  title: string;
  order: number;
  songCount: number;
  duration: number | null;
  songs: { uuid: string; title: string }[];
};

export async function fetchCourses() {
  return getDb().select().from(courses);
}

export async function fetchCourseLessons(
  courseUuid: string,
): Promise<CourseLessonRow[]> {
  const db = getDb();

  const lessonRows = await db
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

  if (lessonRows.length === 0) return [];

  const lessonUuids = lessonRows.map((r) => r.lessonUuid);
  const songRows = await db
    .select({
      lessonUuid: lessonSongs.lessonUuid,
      uuid: songs.uuid,
      title: songs.title,
    })
    .from(lessonSongs)
    .innerJoin(songs, eq(songs.uuid, lessonSongs.songUuid))
    .where(inArray(lessonSongs.lessonUuid, lessonUuids));

  const songsByLesson = new Map<string, { uuid: string; title: string }[]>();
  for (const row of songRows) {
    const arr = songsByLesson.get(row.lessonUuid) ?? [];
    arr.push({ uuid: row.uuid, title: row.title });
    songsByLesson.set(row.lessonUuid, arr);
  }

  return lessonRows.map((row) => ({
    ...row,
    songs: songsByLesson.get(row.lessonUuid) ?? [],
  }));
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

function toYoutubeWatchUrl(url: string): string {
  return url.replace(/youtube\.com\/embed\/([^?#/]+)/, "youtube.com/watch?v=$1");
}

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

  return {
    ...lesson,
    videoUrl: toYoutubeWatchUrl(lesson.videoUrl),
    totalLessonsInCourse: total,
    songs: songRows,
  };
}

export async function fetchLessonVideoPath(lessonUuid: string): Promise<string | null> {
  const db = getDb();
  const [lesson] = await db
    .select({ localVideoPath: lessons.localVideoPath })
    .from(lessons)
    .where(eq(lessons.uuid, lessonUuid));
  return lesson?.localVideoPath ?? null;
}

export function useLessonDetail(lessonUuid: string, courseUuid: string) {
  return useQuery({
    queryKey: ["lesson-detail", lessonUuid, courseUuid],
    queryFn: () => fetchLessonDetail(lessonUuid, courseUuid),
    enabled: lessonUuid.length > 0 && courseUuid.length > 0,
  });
}

export type LessonSongCount = { lessonUuid: string; songCount: number };

// Every lesson exactly once regardless of how many courses it belongs to —
// courseLessons is deliberately not joined here.
export async function fetchAllLessonSongCounts(): Promise<LessonSongCount[]> {
  return getDb()
    .select({ lessonUuid: lessons.uuid, songCount: count(lessonSongs.songUuid) })
    .from(lessons)
    .leftJoin(lessonSongs, eq(lessonSongs.lessonUuid, lessons.uuid))
    .groupBy(lessons.uuid);
}

// Driven from `lessons` rather than `lessonSongs`: a lesson that teaches no
// songs still gets a key, so a missing key means the lesson is not in the
// local content at all.
export async function fetchSongIdsByLesson(
  lessonUuids: string[],
): Promise<Record<string, string[]>> {
  if (lessonUuids.length === 0) return {};

  const rows = await getDb()
    .select({ lessonUuid: lessons.uuid, songUuid: lessonSongs.songUuid })
    .from(lessons)
    .leftJoin(lessonSongs, eq(lessonSongs.lessonUuid, lessons.uuid))
    .where(inArray(lessons.uuid, lessonUuids));

  const byLesson: Record<string, string[]> = {};
  for (const row of rows) {
    const songIds = (byLesson[row.lessonUuid] ??= []);
    if (row.songUuid !== null) songIds.push(row.songUuid);
  }
  return byLesson;
}

export function useCompletedLessonsCount(): number {
  const { progress } = useProgress();
  const query = useQuery({
    queryKey: ["lessons", "all-song-counts"],
    queryFn: fetchAllLessonSongCounts,
  });

  return useMemo(() => {
    if (!query.data) return 0;
    return query.data.filter((lesson) =>
      isLessonCompleted(lesson, progress[lesson.lessonUuid]),
    ).length;
  }, [query.data, progress]);
}

export type DownloadedVideo = {
  lessonUuid: string;
  title: string;
  sizeBytes: number;
};

// Computed on demand rather than cached — a video can be deleted outside the
// app (e.g. low storage cleanup), and a stale cached size would then be wrong.
export async function listDownloadedVideos(): Promise<DownloadedVideo[]> {
  const rows = await getDb()
    .select({
      uuid: lessons.uuid,
      title: lessons.title,
      localVideoPath: lessons.localVideoPath,
    })
    .from(lessons)
    .where(eq(lessons.videoDownloadStatus, "downloaded"));

  const videos = await Promise.all(
    rows.map(async (row) => {
      if (!row.localVideoPath) return null;
      const info = await FileSystem.getInfoAsync(row.localVideoPath);
      if (!info.exists) return null;
      return { lessonUuid: row.uuid, title: row.title, sizeBytes: info.size ?? 0 };
    }),
  );
  return videos.filter((v): v is DownloadedVideo => v !== null);
}

export function useDownloadedVideos() {
  return useQuery({
    queryKey: ["lessons", "downloaded-videos"],
    queryFn: listDownloadedVideos,
  });
}

export type FavoriteLessonRow = {
  lessonUuid: string;
  title: string;
  courseUuid: string;
  courseTitle: string;
  order: number;
  totalInCourse: number;
};

// A lesson can belong to more than one course (see fetchAllLessonSongCounts) —
// pick the oldest course (createdAt, then uuid to break ties) so a favorited
// lesson always resolves to the same navigation target regardless of
// query-plan or insertion order.
export async function fetchFavoriteLessons(
  favoriteUuids: string[],
): Promise<FavoriteLessonRow[]> {
  if (favoriteUuids.length === 0) return [];
  const db = getDb();

  // Both selects run inside one transaction so a concurrent sync (which
  // deletes and re-inserts course_lessons, see sync.ts) can't remove a
  // course between the join query and the totals query.
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        lessonUuid: lessons.uuid,
        title: lessons.title,
        courseUuid: courses.uuid,
        courseTitle: courses.title,
        order: courseLessons.order,
      })
      .from(lessons)
      .innerJoin(courseLessons, eq(courseLessons.lessonUuid, lessons.uuid))
      .innerJoin(courses, eq(courses.uuid, courseLessons.courseUuid))
      .where(inArray(lessons.uuid, favoriteUuids))
      .orderBy(asc(courses.createdAt), asc(courses.uuid));

    const byLesson = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byLesson.has(row.lessonUuid)) byLesson.set(row.lessonUuid, row);
    }
    if (byLesson.size === 0) return [];

    const courseUuids = [...new Set([...byLesson.values()].map((r) => r.courseUuid))];
    const totals = await tx
      .select({ courseUuid: courseLessons.courseUuid, total: count() })
      .from(courseLessons)
      .where(inArray(courseLessons.courseUuid, courseUuids))
      .groupBy(courseLessons.courseUuid);
    const totalByCourse = new Map(totals.map((t) => [t.courseUuid, t.total]));

    // Every row's courseUuid came from courseLessons itself, so a miss here
    // means the totals query is broken — surface it rather than fabricating
    // a plausible-looking total from row.order.
    return [...byLesson.values()].map((row) => {
      const totalInCourse = totalByCourse.get(row.courseUuid);
      if (totalInCourse == null) {
        throw new Error(`No lesson total found for course ${row.courseUuid}`);
      }
      return { ...row, totalInCourse };
    });
  });
}

// Favorites order in settings is insertion order (see addFavorite/removeFavorite
// in features/settings/store.ts), so reversing it gives most-recently-added first.
export function useFavoriteLessons(limit?: number) {
  const { favorites } = useFavorites();

  const query = useQuery({
    queryKey: ["favorite-lessons", favorites],
    queryFn: () => fetchFavoriteLessons(favorites),
    enabled: favorites.length > 0,
  });

  const lessonsList = useMemo(() => {
    const byUuid = new Map((query.data ?? []).map((row) => [row.lessonUuid, row]));
    const ordered = [...favorites]
      .reverse()
      .map((uuid) => byUuid.get(uuid))
      .filter((row): row is FavoriteLessonRow => row != null);
    return limit != null ? ordered.slice(0, limit) : ordered;
  }, [query.data, favorites, limit]);

  return { ...query, lessons: lessonsList };
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
      query.data.find((row) => !isLessonCompleted(row, progress[row.lessonUuid])) ??
      query.data.at(-1)
    );
  }, [query.data, progress]);

  return { ...query, lesson };
}
