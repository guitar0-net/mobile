// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export { ActivitySessionTracker } from "./components/session-tracker";
export { ActivityGrid } from "./components/activity-grid";
export { ActivityStatCards } from "./components/activity-stat-cards";
export { LessonTimeline } from "./components/lesson-timeline";
export { ProfileHeader } from "./components/profile-header";
export { recordLessonViewed, recordSongCompletion } from "./completion-recorder";
export { resetActivity } from "./reset";
export {
  useActivityHistory,
  useActivityStreak,
  useActivityTimeline,
  useActivityTotalTime,
} from "./queries";
export type { ActivityTimelineEntry } from "./queries";
export type { ActivityDayBucket } from "./logic";
