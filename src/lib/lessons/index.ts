// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export { initDb, getDb } from "./db";
export { syncAll } from "./sync";
export type { SyncProgress, SyncDeps } from "./sync";

export type {
  Course,
  NewCourse,
  Lesson,
  NewLesson,
  CourseLesson,
  NewCourseLesson,
  Song,
  NewSong,
  Chord,
  NewChord,
  SongChord,
  NewSongChord,
  Scheme,
  NewScheme,
} from "./schema";
