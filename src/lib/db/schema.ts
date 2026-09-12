// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const VIDEO_DOWNLOAD_STATUSES = [
  "idle",
  "downloading",
  "downloaded",
  "failed",
] as const;
export type VideoDownloadStatus = (typeof VIDEO_DOWNLOAD_STATUSES)[number];

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const courses = sqliteTable("courses", {
  uuid: text("uuid").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const lessons = sqliteTable("lessons", {
  uuid: text("uuid").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  duration: integer("duration"),
  updatedAt: text("updated_at").notNull(),
  syncedAt: text("synced_at"),
  localVideoPath: text("local_video_path"),
  // Typed enum: only valid statuses compile; inferred Lesson type is narrowed.
  videoDownloadStatus: text("video_download_status", {
    enum: VIDEO_DOWNLOAD_STATUSES,
  })
    .notNull()
    .default("idle"),
});

// Junction table — mirrors server CourseLesson through model.
export const courseLessons = sqliteTable(
  "course_lessons",
  {
    courseUuid: text("course_uuid")
      .notNull()
      .references(() => courses.uuid),
    lessonUuid: text("lesson_uuid")
      .notNull()
      .references(() => lessons.uuid),
    order: integer("order").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.courseUuid, t.lessonUuid] }),
    index("course_lessons_lesson_uuid_idx").on(t.lessonUuid),
  ],
);

// Junction table — mirrors M2M addition_lessons on LessonDetail.
export const lessonAdditionLessons = sqliteTable(
  "lesson_addition_lessons",
  {
    lessonUuid: text("lesson_uuid")
      .notNull()
      .references(() => lessons.uuid),
    additionLessonUuid: text("addition_lesson_uuid")
      .notNull()
      .references(() => lessons.uuid),
  },
  (t) => [
    primaryKey({ columns: [t.lessonUuid, t.additionLessonUuid] }),
    index("lesson_addition_lessons_addition_lesson_uuid_idx").on(t.additionLessonUuid),
  ],
);

export const songs = sqliteTable("songs", {
  uuid: text("uuid").primaryKey(),
  title: text("title").notNull(),
  text: text("text").notNull(),
  metronome: integer("metronome").notNull().default(0),
});

// Junction table — mirrors M2M between lessons and songs.
export const lessonSongs = sqliteTable(
  "lesson_songs",
  {
    lessonUuid: text("lesson_uuid")
      .notNull()
      .references(() => lessons.uuid),
    songUuid: text("song_uuid")
      .notNull()
      .references(() => songs.uuid),
  },
  (t) => [
    primaryKey({ columns: [t.lessonUuid, t.songUuid] }),
    index("lesson_songs_song_uuid_idx").on(t.songUuid),
  ],
);

export const chords = sqliteTable("chords", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  musicalTitle: text("musical_title").notNull(),
  svgHorizontal: text("svg_horizontal"),
  svgVertical: text("svg_vertical"),
  startFret: integer("start_fret"),
  hasBarre: integer("has_barre", { mode: "boolean" }).notNull().default(false),
  orderInNote: integer("order_in_note"),
});

export const songChords = sqliteTable(
  "song_chords",
  {
    songUuid: text("song_uuid")
      .notNull()
      .references(() => songs.uuid),
    chordId: integer("chord_id")
      .notNull()
      .references(() => chords.id),
  },
  (t) => [
    primaryKey({ columns: [t.songUuid, t.chordId] }),
    index("song_chords_chord_id_idx").on(t.chordId),
  ],
);

export const schemes = sqliteTable("schemes", {
  id: integer("id").primaryKey(),
  image: text("image").notNull(),
  inscription: text("inscription"),
  height: integer("height"),
  width: integer("width"),
  localImagePath: text("local_image_path"),
});

export const songSchemes = sqliteTable(
  "song_schemes",
  {
    songUuid: text("song_uuid")
      .notNull()
      .references(() => songs.uuid),
    schemeId: integer("scheme_id")
      .notNull()
      .references(() => schemes.id),
  },
  (t) => [
    primaryKey({ columns: [t.songUuid, t.schemeId] }),
    index("song_schemes_scheme_id_idx").on(t.schemeId),
  ],
);

export const ACTIVITY_EVENT_TYPES = [
  "session",
  "lesson_video_viewed",
  "song_completed",
] as const;
export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

// Append-only event log — source of truth for the activity timeline and for
// future sync of fine-grained history to a server-side account.
export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  type: text("type", { enum: ACTIVITY_EVENT_TYPES }).notNull(),
  entityId: text("entity_id"),
  title: text("title"),
  lessonTitle: text("lesson_title"),
  value: integer("value", { mode: "boolean" }),
  durationSeconds: integer("duration_seconds"),
  occurredAt: text("occurred_at").notNull(),
  createdAt: text("created_at").notNull(),
});

// Derived rollup, one row per local calendar day — fast-read cache so the
// heatmap/streak/badges never have to re-aggregate the full event history.
export const activityDaily = sqliteTable("activity_daily", {
  date: text("date").primaryKey(),
  totalSeconds: integer("total_seconds").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const confirmedDonations = sqliteTable("confirmed_donations", {
  storeTransactionId: text("store_transaction_id").primaryKey(),
  productId: text("product_id").notNull(),
  verifiedAt: text("verified_at").notNull(),
});

// ---------------------------------------------------------------------------
// Inferred TypeScript row types — no hand-written interfaces
// ---------------------------------------------------------------------------

export type Course = InferSelectModel<typeof courses>;
export type NewCourse = InferInsertModel<typeof courses>;

export type Lesson = InferSelectModel<typeof lessons>;
export type NewLesson = InferInsertModel<typeof lessons>;

export type CourseLesson = InferSelectModel<typeof courseLessons>;
export type NewCourseLesson = InferInsertModel<typeof courseLessons>;

export type LessonAdditionLesson = InferSelectModel<typeof lessonAdditionLessons>;
export type NewLessonAdditionLesson = InferInsertModel<typeof lessonAdditionLessons>;

export type Song = InferSelectModel<typeof songs>;
export type NewSong = InferInsertModel<typeof songs>;

export type LessonSong = InferSelectModel<typeof lessonSongs>;
export type NewLessonSong = InferInsertModel<typeof lessonSongs>;

export type Chord = InferSelectModel<typeof chords>;
export type NewChord = InferInsertModel<typeof chords>;

export type SongChord = InferSelectModel<typeof songChords>;
export type NewSongChord = InferInsertModel<typeof songChords>;

export type Scheme = InferSelectModel<typeof schemes>;
export type NewScheme = InferInsertModel<typeof schemes>;

export type SongScheme = InferSelectModel<typeof songSchemes>;
export type NewSongScheme = InferInsertModel<typeof songSchemes>;

export type ActivityEvent = InferSelectModel<typeof activityEvents>;
export type NewActivityEvent = InferInsertModel<typeof activityEvents>;

export type ActivityDaily = InferSelectModel<typeof activityDaily>;
export type NewActivityDaily = InferInsertModel<typeof activityDaily>;

export type ConfirmedDonation = InferSelectModel<typeof confirmedDonations>;
export type NewConfirmedDonation = InferInsertModel<typeof confirmedDonations>;
