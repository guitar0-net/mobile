// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { eq, inArray, notInArray, or } from "drizzle-orm";

import type { AppDb } from "@/lib/db";
import {
  chords as chordsTable,
  contentMeta as contentMetaTable,
  courseLessons as courseLessonsTable,
  courses as coursesTable,
  lessonAdditionLessons as lessonAdditionLessonsTable,
  lessonSongs as lessonSongsTable,
  lessons as lessonsTable,
  schemes as schemesTable,
  songChords as songChordsTable,
  songSchemes as songSchemesTable,
  songs as songsTable,
} from "@/lib/db";

import { getSyncData as defaultGetSyncData } from "./api";
import type { SyncLessonsResponse } from "./api";
import { deleteSchemeImageFiles } from "./scheme-images";
import { readSnapshot as defaultReadSnapshot, SNAPSHOT_VERSION } from "./snapshot";
import type { ContentSnapshot } from "./snapshot";

const CONTENT_META_ID = 1;

export type SyncDeps = {
  getSyncData: (since: string | null) => Promise<SyncLessonsResponse>;
};

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

function deleteOrphanedSchemes(tx: SyncTx): string[] {
  const linkedIds = tx.select({ id: songSchemesTable.schemeId }).from(songSchemesTable);
  const orphans = tx
    .select({ fileName: schemesTable.localImagePath })
    .from(schemesTable)
    .where(notInArray(schemesTable.id, linkedIds))
    .all();
  tx.delete(schemesTable).where(notInArray(schemesTable.id, linkedIds)).run();
  return orphans.flatMap(({ fileName }) => (fileName ? [fileName] : []));
}

function writeAdditionLessons(
  tx: SyncTx,
  lessons: SyncLessonsResponse["lessons"],
): void {
  if (lessons.length === 0) return;
  tx.delete(lessonAdditionLessonsTable)
    .where(
      inArray(
        lessonAdditionLessonsTable.lessonUuid,
        lessons.map((lesson) => lesson.uuid),
      ),
    )
    .run();

  const localUuids = new Set(
    tx
      .select({ uuid: lessonsTable.uuid })
      .from(lessonsTable)
      .all()
      .map((row) => row.uuid),
  );
  const rows = lessons.flatMap((lesson) =>
    (lesson.addition_lesson_uuids ?? [])
      .filter((uuid) => localUuids.has(uuid))
      .map((additionLessonUuid) => ({ lessonUuid: lesson.uuid, additionLessonUuid })),
  );
  if (rows.length > 0) {
    tx.insert(lessonAdditionLessonsTable).values(rows).onConflictDoNothing().run();
  }
}

function deleteRemovedLessons(tx: SyncTx, serverUuids: string[]): void {
  if (serverUuids.length === 0) {
    tx.delete(lessonAdditionLessonsTable).run();
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
    tx.delete(lessonAdditionLessonsTable)
      .where(
        or(
          eq(lessonAdditionLessonsTable.lessonUuid, uuid),
          eq(lessonAdditionLessonsTable.additionLessonUuid, uuid),
        ),
      )
      .run();
    tx.delete(lessonSongsTable).where(eq(lessonSongsTable.lessonUuid, uuid)).run();
    tx.delete(lessonsTable).where(eq(lessonsTable.uuid, uuid)).run();
  }
}

/**
 * Writes the whole payload and its version in one transaction, so an
 * interrupted write never leaves partially applied content. Scheme images are
 * not part of it — `useSchemeImage` downloads them when a song is opened.
 */
function writeContent(db: AppDb, payload: SyncLessonsResponse): void {
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
  } = payload;

  const songsByLesson = new Map<string, typeof songs>();
  for (const song of songs) {
    const bucket = songsByLesson.get(song.lesson_uuid) ?? [];
    bucket.push(song);
    songsByLesson.set(song.lesson_uuid, bucket);
  }
  const now = new Date().toISOString();
  const staleImageFiles: string[] = [];

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

    const existingSchemes = new Map(
      tx
        .select({
          id: schemesTable.id,
          image: schemesTable.image,
          fileName: schemesTable.localImagePath,
        })
        .from(schemesTable)
        .all()
        .map((row) => [row.id, row]),
    );
    for (const scheme of schemes) {
      const existing = existingSchemes.get(scheme.id);
      const isImageChanged = existing != null && existing.image !== scheme.image;
      if (isImageChanged && existing.fileName) staleImageFiles.push(existing.fileName);
      const values = {
        image: scheme.image,
        inscription: scheme.inscription ?? null,
        height: scheme.height ?? null,
        width: scheme.width ?? null,
        localImagePath: isImageChanged ? null : (existing?.fileName ?? null),
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
          chordText: song.chord_text,
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

    writeAdditionLessons(tx, lessons);
    deleteRemovedLessons(tx, lesson_uuids);
    deleteOrphanedSongs(tx);
    staleImageFiles.push(...deleteOrphanedSchemes(tx));

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

    if (version != null) {
      tx.insert(contentMetaTable)
        .values({ id: CONTENT_META_ID, version })
        .onConflictDoUpdate({ target: contentMetaTable.id, set: { version } })
        .run();
    }
  });

  deleteSchemeImageFiles(staleImageFiles);
}

export function getContentVersion(db: AppDb): string | null {
  const row = db
    .select({ version: contentMetaTable.version })
    .from(contentMetaTable)
    .where(eq(contentMetaTable.id, CONTENT_META_ID))
    .get();
  return row?.version ?? null;
}

/**
 * Stores `version` as the local content version unless one is already stored.
 * For content written before `content_meta` existed.
 */
export function adoptContentVersion(db: AppDb, version: string): void {
  db.insert(contentMetaTable)
    .values({ id: CONTENT_META_ID, version })
    .onConflictDoNothing()
    .run();
}

export type SyncResult = { previousVersion: string | null; version: string | null };

export async function syncAll(
  db: AppDb,
  deps?: Partial<SyncDeps>,
): Promise<SyncResult> {
  const { getSyncData = defaultGetSyncData } = deps ?? {};
  const previousVersion = getContentVersion(db);
  const payload = await getSyncData(previousVersion);
  writeContent(db, payload);
  return { previousVersion, version: payload.version ?? previousVersion };
}

// The server sends microseconds, while ECMAScript only guarantees parsing of
// ISO timestamps with milliseconds.
function parseVersion(version: string): number {
  return Date.parse(version.replace(/(\.\d{3})\d+/, "$1"));
}

function isNewer(candidate: string, local: string | null): boolean {
  if (local === null) return true;
  const localTime = parseVersion(local);
  if (Number.isNaN(localTime)) return true;
  return parseVersion(candidate) > localTime;
}

export type SnapshotResult = {
  applied: boolean;
  snapshotVersion: string;
  previousVersion: string | null;
  readMs: number;
  writeMs: number;
};

export type SnapshotDeps = {
  snapshotVersion: string;
  readSnapshot: () => Promise<ContentSnapshot>;
};

/**
 * Writes the content bundled with the app when it is strictly newer than the
 * local content, so it never rolls back a delta that already arrived.
 */
export async function applyContentSnapshot(
  db: AppDb,
  deps?: Partial<SnapshotDeps>,
): Promise<SnapshotResult> {
  const { snapshotVersion = SNAPSHOT_VERSION, readSnapshot = defaultReadSnapshot } =
    deps ?? {};
  const previousVersion = getContentVersion(db);
  if (!isNewer(snapshotVersion, previousVersion)) {
    return { applied: false, snapshotVersion, previousVersion, readMs: 0, writeMs: 0 };
  }
  const readStartedAt = performance.now();
  const snapshot = await readSnapshot();
  const readMs = performance.now() - readStartedAt;
  const writeStartedAt = performance.now();
  writeContent(db, snapshot);
  return {
    applied: true,
    snapshotVersion: snapshot.version,
    previousVersion,
    readMs,
    writeMs: performance.now() - writeStartedAt,
  };
}
