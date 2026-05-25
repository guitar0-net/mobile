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

export const lessons = sqliteTable(
  "lessons",
  {
    uuid: text("uuid").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    videoUrl: text("video_url"),
    duration: integer("duration"),
    courseUuid: text("course_uuid").references(() => courses.uuid),
    updatedAt: text("updated_at").notNull(),
    syncedAt: text("synced_at"),
    localVideoPath: text("local_video_path"),
    // Typed enum: only valid statuses compile; inferred Lesson type is narrowed.
    videoDownloadStatus: text("video_download_status", {
      enum: VIDEO_DOWNLOAD_STATUSES,
    })
      .notNull()
      .default("idle"),
  },
  (t) => [index("lessons_course_uuid_idx").on(t.courseUuid)],
);

export const songs = sqliteTable(
  "songs",
  {
    uuid: text("uuid").primaryKey(),
    lessonUuid: text("lesson_uuid")
      .notNull()
      .references(() => lessons.uuid),
    title: text("title").notNull(),
    text: text("text").notNull(),
    metronome: integer("metronome"),
  },
  (t) => [index("songs_lesson_uuid_idx").on(t.lessonUuid)],
);

export const chords = sqliteTable("chords", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  musicalTitle: text("musical_title"),
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

export const schemes = sqliteTable(
  "schemes",
  {
    id: integer("id").primaryKey(),
    songUuid: text("song_uuid")
      .notNull()
      .references(() => songs.uuid),
    url: text("url").notNull(),
    localImagePath: text("local_image_path"),
  },
  (t) => [index("schemes_song_uuid_idx").on(t.songUuid)],
);

// ---------------------------------------------------------------------------
// Inferred TypeScript row types — no hand-written interfaces
// ---------------------------------------------------------------------------

export type Course = InferSelectModel<typeof courses>;
export type NewCourse = InferInsertModel<typeof courses>;

export type Lesson = InferSelectModel<typeof lessons>;
export type NewLesson = InferInsertModel<typeof lessons>;

export type Song = InferSelectModel<typeof songs>;
export type NewSong = InferInsertModel<typeof songs>;

export type Chord = InferSelectModel<typeof chords>;
export type NewChord = InferInsertModel<typeof chords>;

export type SongChord = InferSelectModel<typeof songChords>;
export type NewSongChord = InferInsertModel<typeof songChords>;

export type Scheme = InferSelectModel<typeof schemes>;
export type NewScheme = InferInsertModel<typeof schemes>;
