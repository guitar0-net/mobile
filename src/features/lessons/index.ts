// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const MAIN_COURSE_ID = "6236a799-32b4-4e98-b9b2-9ade9ba83b47";

export { initDb, getDb } from "./db";
export { syncAll } from "./sync";
export type { SyncProgress, SyncDeps } from "./sync";
export {
  fetchCourses,
  fetchCourseLessons,
  fetchLessonDetail,
  useContinueLesson,
  useLessonDetail,
} from "./queries";
export type { CourseLessonRow, LessonDetailRow, LessonDetailSong } from "./queries";
export { deriveLessonState, computeCourseProgress } from "./logic";
export type { LessonState } from "./logic";

export { CourseContinueCard } from "./components/CourseContinueCard";
export { SongRow } from "./components/SongRow";

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
