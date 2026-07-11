// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const MAIN_COURSE_ID = "6236a799-32b4-4e98-b9b2-9ade9ba83b47";

export { syncAll } from "./sync";
export type { SyncProgress, SyncDeps } from "./sync";
export {
  fetchAllLessonSongCounts,
  fetchCourses,
  fetchCourseLessons,
  fetchLessonDetail,
  fetchLessonVideoPath,
  useCompletedLessonsCount,
  useContinueLesson,
  useLessonDetail,
} from "./queries";
export type {
  CourseLessonRow,
  LessonDetailRow,
  LessonDetailSong,
  LessonSongCount,
} from "./queries";
export { deriveLessonState, computeCourseProgress, isLessonCompleted } from "./logic";
export type { LessonState } from "./logic";

export { videoStreamUrl } from "./use-video-download";
export { CourseContinueCard } from "./components/course-continue-card";
export { SongRow } from "./components/song-row";
export { VideoCard } from "./components/video-card";
