// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";

import * as schema from "./schema";
import migrations from "../../../drizzle/migrations";

export type AppDb = ReturnType<typeof drizzle<typeof schema>>;

let db: AppDb | null = null;

function openDb(): AppDb {
  if (!db) {
    const sqlite = openDatabaseSync("lessons.db");
    // SQLite does not enforce foreign keys by default; enable per-connection.
    sqlite.execSync("PRAGMA foreign_keys = ON;");
    db = drizzle(sqlite, { schema });
  }
  return db;
}

let initPromise: Promise<AppDb> | null = null;

export function initDb(): Promise<AppDb> {
  initPromise ??= (async () => {
    const database = openDb();
    await migrate(database, migrations);
    return database;
  })().catch((error: unknown) => {
    initPromise = null;
    throw error;
  });
  return initPromise;
}

export function getDb(): AppDb {
  if (!db) {
    throw new Error("Database not initialised — call initDb() before getDb()");
  }
  return db;
}

export function _resetDbForTesting(): void {
  db = null;
  initPromise = null;
}

export {
  courses,
  lessons,
  courseLessons,
  lessonAdditionLessons,
  songs,
  lessonSongs,
  chords,
  songChords,
  schemes,
  songSchemes,
  activityEvents,
  activityDaily,
  confirmedDonations,
  VIDEO_DOWNLOAD_STATUSES,
  ACTIVITY_EVENT_TYPES,
} from "./schema";

export type {
  Course,
  NewCourse,
  Lesson,
  NewLesson,
  CourseLesson,
  NewCourseLesson,
  LessonAdditionLesson,
  NewLessonAdditionLesson,
  Song,
  NewSong,
  LessonSong,
  NewLessonSong,
  Chord,
  NewChord,
  SongChord,
  NewSongChord,
  Scheme,
  NewScheme,
  SongScheme,
  NewSongScheme,
  ActivityEvent,
  NewActivityEvent,
  ActivityDaily,
  NewActivityDaily,
  ConfirmedDonation,
  NewConfirmedDonation,
  VideoDownloadStatus,
  ActivityEventType,
} from "./schema";
