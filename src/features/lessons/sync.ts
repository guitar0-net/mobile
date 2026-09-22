// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { eq, notInArray } from "drizzle-orm";
import { Directory, File as FSFile, Paths } from "expo-file-system";

import type { AppDb } from "@/lib/db";
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
} from "@/lib/db";
import { RequestTimeoutError } from "@/lib/network";
import type { components } from "@/lib/network/api.types";

import { getSyncData as defaultGetSyncData } from "./api";

type SyncLessonsResponse = components["schemas"]["SyncLessonsResponse"];

export type SyncProgress =
  { stage: "downloading"; total: number; completed: number } | { stage: "saving" };

export type SyncDeps = {
  getSyncData: (since: string | null) => Promise<SyncLessonsResponse>;
  downloadImage: (schemeId: number, url: string) => Promise<string>;
};

const IMAGE_STALL_TIMEOUT_MS = 20_000;
const IMAGE_RETRY_DELAYS_MS = [1_000, 3_000];

async function defaultDownloadImage(schemeId: number, url: string): Promise<string> {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? "";
  const absoluteUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;
  const imagesDir = new Directory(Paths.document, "images");
  imagesDir.create({ intermediates: true, idempotent: true });
  const dest = new FSFile(imagesDir, `${schemeId}.png`);

  const controller = new AbortController();
  let stallTimer = setTimeout(() => controller.abort(), IMAGE_STALL_TIMEOUT_MS);
  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), IMAGE_STALL_TIMEOUT_MS);
  };
  try {
    const downloaded = await FSFile.downloadFileAsync(absoluteUrl, dest, {
      idempotent: true,
      signal: controller.signal,
      onProgress: resetStallTimer,
    });
    return downloaded.uri;
  } catch (error) {
    if (controller.signal.aborted) throw new RequestTimeoutError(absoluteUrl);
    throw error;
  } finally {
    clearTimeout(stallTimer);
  }
}

async function withImageRetries<T>(attempt: () => Promise<T>): Promise<T> {
  for (const delayMs of IMAGE_RETRY_DELAYS_MS) {
    try {
      return await attempt();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return attempt();
}

type SyncTx = Parameters<Parameters<AppDb["transaction"]>[0]>[0];

function deleteOrphanedSongs(tx: SyncTx): void {
  const linkedUuids = tx
    .select({ uuid: lessonSongsTable.songUuid })
    .from(lessonSongsTable);
  tx.delete(songChordsTable)
    .where(notInArray(songChordsTable.songUuid, linkedUuids))
    .run();
  tx.delete(songSchemesTable)
    .where(notInArray(songSchemesTable.songUuid, linkedUuids))
    .run();
  tx.delete(songsTable).where(notInArray(songsTable.uuid, linkedUuids)).run();
}

function deleteRemovedLessons(tx: SyncTx, serverUuids: string[]): void {
  if (serverUuids.length === 0) {
    tx.delete(lessonSongsTable).run();
    tx.delete(lessonsTable).run();
    return;
  }
  const toDelete = tx
    .select({ uuid: lessonsTable.uuid })
    .from(lessonsTable)
    .where(notInArray(lessonsTable.uuid, serverUuids))
    .all();
  for (const { uuid } of toDelete) {
    tx.delete(lessonSongsTable).where(eq(lessonSongsTable.lessonUuid, uuid)).run();
    tx.delete(lessonsTable).where(eq(lessonsTable.uuid, uuid)).run();
  }
}

/**
 * Downloads every scheme image first, then writes the whole payload in one
 * transaction, so an interrupted sync never leaves partially applied content.
 */
export async function syncAll(
  db: AppDb,
  since: string | null,
  onProgress?: (progress: SyncProgress) => void | Promise<void>,
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

  const localImagePaths = new Map<number, string>();
  for (const scheme of schemes) {
    const localImagePath = await withImageRetries(() =>
      downloadImage(scheme.id, scheme.image),
    );
    localImagePaths.set(scheme.id, localImagePath);
    await onProgress?.({
      stage: "downloading",
      total: schemes.length,
      completed: localImagePaths.size,
    });
  }

  await onProgress?.({ stage: "saving" });

  const songsByLesson = new Map<string, typeof songs>();
  for (const song of songs) {
    const bucket = songsByLesson.get(song.lesson_uuid) ?? [];
    bucket.push(song);
    songsByLesson.set(song.lesson_uuid, bucket);
  }
  const now = new Date().toISOString();

  db.transaction((tx) => {
    for (const chord of chords) {
      const values = {
        title: chord.title,
        musicalTitle: chord.musical_title,
        svgHorizontal: chord.svg_horizontal,
        svgVertical: chord.svg_vertical,
        startFret: chord.start_fret,
        hasBarre: chord.has_barre ?? false,
        orderInNote: chord.order_in_note,
      };
      tx.insert(chordsTable)
        .values({ id: chord.id, ...values })
        .onConflictDoUpdate({ target: chordsTable.id, set: values })
        .run();
    }

    for (const scheme of schemes) {
      const values = {
        image: scheme.image,
        inscription: scheme.inscription ?? null,
        height: scheme.height ?? null,
        width: scheme.width ?? null,
        localImagePath: localImagePaths.get(scheme.id) ?? null,
      };
      tx.insert(schemesTable)
        .values({ id: scheme.id, ...values })
        .onConflictDoUpdate({ target: schemesTable.id, set: values })
        .run();
    }

    for (const lesson of lessons) {
      const values = {
        title: lesson.title,
        description: lesson.description,
        videoUrl: lesson.video_url,
        duration: lesson.duration,
        updatedAt: lesson.updated_at,
        syncedAt: now,
      };
      tx.insert(lessonsTable)
        .values({ uuid: lesson.uuid, ...values })
        .onConflictDoUpdate({ target: lessonsTable.uuid, set: values })
        .run();

      tx.delete(lessonSongsTable)
        .where(eq(lessonSongsTable.lessonUuid, lesson.uuid))
        .run();

      for (const song of songsByLesson.get(lesson.uuid) ?? []) {
        const songValues = {
          title: song.title,
          text: song.text,
          metronome: song.metronome,
        };
        tx.insert(songsTable)
          .values({ uuid: song.uuid, ...songValues })
          .onConflictDoUpdate({ target: songsTable.uuid, set: songValues })
          .run();

        tx.delete(songChordsTable).where(eq(songChordsTable.songUuid, song.uuid)).run();
        for (const chordId of song.chord_ids) {
          tx.insert(songChordsTable)
            .values({ songUuid: song.uuid, chordId })
            .onConflictDoNothing()
            .run();
        }

        tx.delete(songSchemesTable)
          .where(eq(songSchemesTable.songUuid, song.uuid))
          .run();
        for (const schemeId of song.scheme_ids) {
          tx.insert(songSchemesTable)
            .values({ songUuid: song.uuid, schemeId })
            .onConflictDoNothing()
            .run();
        }

        tx.insert(lessonSongsTable)
          .values({ lessonUuid: lesson.uuid, songUuid: song.uuid })
          .onConflictDoNothing()
          .run();
      }
    }

    deleteRemovedLessons(tx, lesson_uuids);
    deleteOrphanedSongs(tx);

    tx.delete(courseLessonsTable).run();
    for (const course of courses) {
      tx.insert(coursesTable)
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
        })
        .run();
    }
    if (course_lessons.length > 0) {
      tx.insert(courseLessonsTable)
        .values(
          course_lessons.map((cl) => ({
            courseUuid: cl.course_uuid,
            lessonUuid: cl.lesson_uuid,
            order: cl.order,
          })),
        )
        .run();
    }
    if (course_uuids.length === 0) {
      tx.delete(coursesTable).run();
    } else {
      tx.delete(coursesTable).where(notInArray(coursesTable.uuid, course_uuids)).run();
    }
  });

  return version;
}
