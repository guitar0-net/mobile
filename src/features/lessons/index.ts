// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export const MAIN_COURSE_ID = "6236a799-32b4-4e98-b9b2-9ade9ba83b47";

export {
  adoptContentVersion,
  applyContentSnapshot,
  getContentVersion,
  syncAll,
} from "./sync";
export type { SnapshotDeps, SnapshotResult, SyncDeps, SyncResult } from "./sync";
export { useSchemeImage } from "./scheme-images";
export type { SchemeImageState } from "./scheme-images";
export {
  fetchAllLessonSongCounts,
  fetchCourses,
  fetchCourseLessons,
  fetchLessonDetail,
  fetchLessonVideoPath,
  fetchSongIdsByLesson,
  invalidateContentQueries,
  listDownloadedVideos,
  useCompletedLessonsCount,
  useContinueLesson,
  useDownloadedVideos,
  useLessonDetail,
} from "./queries";
export type {
  CourseLessonRow,
  DownloadedVideo,
  LessonDetailRow,
  LessonDetailSong,
  LessonSongCount,
} from "./queries";
export { deriveLessonState, computeCourseProgress, isLessonCompleted } from "./logic";
export type { LessonState } from "./logic";

export { deleteAllDownloadedVideos, videoStreamUrl } from "./use-video-download";
export { CourseContinueCard } from "./components/course-continue-card";
export { DownloadedVideosList } from "./components/downloaded-videos-list";
export { FavoriteLessonsList } from "./components/favorite-lessons-list";
export { FavoritesPreview } from "./components/favorites-preview";
export { LessonLinkCard } from "./components/lesson-link-card";
export { LessonStatus } from "./components/lesson-status";
export { LessonSwipeNavigator } from "./components/lesson-swipe-navigator";
export { SongRow } from "./components/song-row";
export { VideoCard } from "./components/video-card";
