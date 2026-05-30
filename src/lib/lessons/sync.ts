// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { eq, notInArray } from "drizzle-orm";
import { Directory, File as FSFile, Paths } from "expo-file-system";

import { getSyncData as defaultGetSyncData } from "@/lib/network";
import type { components } from "@/lib/network/api.types";

import type { LessonsDb } from "./db";
import {
  chords as chordsTable,
  courseLessons as courseLessonsTable,
  courses as coursesTable,
  lessonSongs as lessonSongsTable,
  lessons as lessonsTable,
  schemes as schemesTable,
  songChords as songChordsTable,
  songSchemes as songSchemesTable,
  songs as songsTable,
} from "./schema";

type SyncLessonsResponse = components["schemas"]["SyncLessonsResponse"];

export type SyncProgress = {
  total: number;
  completed: number;
};

export type SyncDeps = {
  getSyncData: (since: string | null) => Promise<SyncLessonsResponse>;
  downloadImage: (schemeId: number, url: string) => Promise<string>;
};

async function defaultDownloadImage(schemeId: number, url: string): Promise<string> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const absoluteUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
  const imagesDir = new Directory(Paths.document, "images");
  imagesDir.create({ intermediates: true, idempotent: true });
  const dest = new FSFile(imagesDir, `${schemeId}.png`);
  const downloaded = await FSFile.downloadFileAsync(absoluteUrl, dest, {
    idempotent: true,
  });
  return downloaded.uri;
}

async function deleteJunctionsForLesson(
  db: LessonsDb,
  lessonUuid: string,
): Promise<void> {
  await db.delete(lessonSongsTable).where(eq(lessonSongsTable.lessonUuid, lessonUuid));
}

async function deleteOrphanedSongs(db: LessonsDb): Promise<void> {
  const linkedUuids = db
    .select({ uuid: lessonSongsTable.songUuid })
    .from(lessonSongsTable);
  await db
    .delete(songChordsTable)
    .where(notInArray(songChordsTable.songUuid, linkedUuids));
  await db
    .delete(songSchemesTable)
    .where(notInArray(songSchemesTable.songUuid, linkedUuids));
  await db.delete(songsTable).where(notInArray(songsTable.uuid, linkedUuids));
}

async function deleteRemovedLessons(
  db: LessonsDb,
  serverUuids: string[],
): Promise<void> {
  if (serverUuids.length === 0) {
    await db.delete(lessonSongsTable);
    await db.delete(lessonsTable);
    return;
  }
  const toDelete = await db
    .select({ uuid: lessonsTable.uuid })
    .from(lessonsTable)
    .where(notInArray(lessonsTable.uuid, serverUuids));
  for (const { uuid } of toDelete) {
    await db.delete(lessonSongsTable).where(eq(lessonSongsTable.lessonUuid, uuid));
    await db.delete(lessonsTable).where(eq(lessonsTable.uuid, uuid));
  }
}

export async function syncAll(
  db: LessonsDb,
  since: string | null,
  onProgress?: (progress: SyncProgress) => void,
  deps?: Partial<SyncDeps>,
): Promise<string | null> {
  const { getSyncData = defaultGetSyncData, downloadImage = defaultDownloadImage } =
    deps ?? {};

  const {
    version,
    lesson_uuids,
    lessons,
    songs,
    chords,
    schemes,
    course_uuids,
    courses,
    course_lessons,
  } = await getSyncData(since);

  // Phase 1: Upsert chords — no FK dependencies, must exist before song_chords.
  for (const chord of chords) {
    await db
      .insert(chordsTable)
      .values({
        id: chord.id,
        title: chord.title,
        musicalTitle: chord.musical_title,
        svgHorizontal: chord.svg_horizontal,
        svgVertical: chord.svg_vertical,
        startFret: chord.start_fret,
        hasBarre: chord.has_barre ?? false,
        orderInNote: chord.order_in_note,
      })
      .onConflictDoUpdate({
        target: chordsTable.id,
        set: {
          title: chord.title,
          musicalTitle: chord.musical_title,
          svgHorizontal: chord.svg_horizontal,
          svgVertical: chord.svg_vertical,
          startFret: chord.start_fret,
          hasBarre: chord.has_barre ?? false,
          orderInNote: chord.order_in_note,
        },
      });
  }

  const total = schemes.length + lessons.length;
  let completed = 0;

  // Phase 2: Download and upsert schemes — no FK dependencies on songs.
  for (const scheme of schemes) {
    const localImagePath = await downloadImage(scheme.id, scheme.image);
    await db
      .insert(schemesTable)
      .values({
        id: scheme.id,
        image: scheme.image,
        inscription: scheme.inscription ?? null,
        height: scheme.height ?? null,
        width: scheme.width ?? null,
        localImagePath,
      })
      .onConflictDoUpdate({
        target: schemesTable.id,
        set: {
          image: scheme.image,
          inscription: scheme.inscription ?? null,
          height: scheme.height ?? null,
          width: scheme.width ?? null,
          localImagePath,
        },
      });
    onProgress?.({ total, completed: ++completed });
  }

  // Build lookup: lesson_uuid → songs[] for per-lesson processing.
  const songsByLesson = new Map<string, typeof songs>();
  for (const song of songs) {
    const bucket = songsByLesson.get(song.lesson_uuid) ?? [];
    bucket.push(song);
    songsByLesson.set(song.lesson_uuid, bucket);
  }

  // Phase 3: Per-lesson — upsert, delete stale songs, insert fresh songs/junctions.
  const now = new Date().toISOString();

  for (const lesson of lessons) {
    await db
      .insert(lessonsTable)
      .values({
        uuid: lesson.uuid,
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.video_url,
        duration: lesson.duration,
        updatedAt: lesson.updated_at,
        syncedAt: now,
      })
      .onConflictDoUpdate({
        target: lessonsTable.uuid,
        set: {
          title: lesson.title,
          description: lesson.description,
          videoUrl: lesson.video_url,
          duration: lesson.duration,
          updatedAt: lesson.updated_at,
          syncedAt: now,
        },
      });

    await deleteJunctionsForLesson(db, lesson.uuid);

    for (const song of songsByLesson.get(lesson.uuid) ?? []) {
      await db
        .insert(songsTable)
        .values({
          uuid: song.uuid,
          title: song.title,
          text: song.text,
          metronome: song.metronome,
        })
        .onConflictDoUpdate({
          target: songsTable.uuid,
          set: { title: song.title, text: song.text, metronome: song.metronome },
        });

      await db.delete(songChordsTable).where(eq(songChordsTable.songUuid, song.uuid));
      for (const chordId of song.chord_ids) {
        await db
          .insert(songChordsTable)
          .values({ songUuid: song.uuid, chordId })
          .onConflictDoNothing();
      }

      await db.delete(songSchemesTable).where(eq(songSchemesTable.songUuid, song.uuid));
      for (const schemeId of song.scheme_ids) {
        await db
          .insert(songSchemesTable)
          .values({ songUuid: song.uuid, schemeId })
          .onConflictDoNothing();
      }

      await db
        .insert(lessonSongsTable)
        .values({ lessonUuid: lesson.uuid, songUuid: song.uuid })
        .onConflictDoNothing();
    }

    completed++;
    onProgress?.({ total, completed });
  }

  // Phase 4: Prune lessons removed from the server, then orphaned songs.
  await deleteRemovedLessons(db, lesson_uuids);
  await deleteOrphanedSongs(db);

  // Phase 5: Replace course_lessons (always full set), upsert courses, prune.
  // Wrapped in a transaction so a crash between delete and re-insert never
  // leaves the client with an empty course_lessons table.
  await db.transaction(async (tx) => {
    await tx.delete(courseLessonsTable);

    for (const course of courses) {
      await tx
        .insert(coursesTable)
        .values({
          uuid: course.uuid,
          title: course.title,
          description: course.description,
          createdAt: course.created_at,
          updatedAt: course.updated_at,
        })
        .onConflictDoUpdate({
          target: coursesTable.uuid,
          set: {
            title: course.title,
            description: course.description,
            updatedAt: course.updated_at,
          },
        });
    }

    if (course_lessons.length > 0) {
      await tx.insert(courseLessonsTable).values(
        course_lessons.map((cl) => ({
          courseUuid: cl.course_uuid,
          lessonUuid: cl.lesson_uuid,
          order: cl.order,
        })),
      );
    }

    if (course_uuids.length === 0) {
      await tx.delete(coursesTable);
    } else {
      await tx.delete(coursesTable).where(notInArray(coursesTable.uuid, course_uuids));
    }
  });

  return version;
}
