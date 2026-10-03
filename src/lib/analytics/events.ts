// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { SyncFailureKind, SyncTrigger } from "@/lib/sync";

export type AnalyticsEvents = {
  chord_orientation_toggled: { orientation: "horizontal" | "vertical" };
  chord_section_visibility_toggled: { visible: boolean };
  scheme_section_visibility_toggled: { visible: boolean };

  song_completion_toggled: { song_id: string; completed: boolean };
  lesson_favorite_toggled: { lesson_id: string; favorited: boolean };
  lesson_video_opened: {
    lesson_id: string;
    destination: "youtube" | "offline" | "online";
  };
  song_pdf_exported: {
    show_chords: boolean;
    show_schemes: boolean;
    show_text: boolean;
    columns_count: number;
  };

  video_fullscreen_entered: { lesson_id: string };
  video_fullscreen_exited: { lesson_id: string };
  video_screen_closed: { lesson_id: string; landscape: boolean; had_error: boolean };

  video_download_started: { lesson_id: string };
  video_download_completed: { lesson_id: string };
  video_download_failed: {
    lesson_id: string;
    reason: `http_${number}` | "exception";
  };

  metronome_started: {
    bpm: number;
    beats: number;
    sound: string;
    source: "metronome_screen" | "song_toolbar";
  };
  tuner_mic_permission_resolved: { granted: boolean };

  content_snapshot_applied: {
    snapshot_version: string;
    previous_version: string | null;
    read_ms: number;
    write_ms: number;
  };
  content_sync_completed: {
    trigger: SyncTrigger;
    previous_version: string | null;
    version: string | null;
    duration_ms: number;
  };
  content_sync_failed: {
    trigger: SyncTrigger;
    kind: SyncFailureKind;
    error_name: string;
    duration_ms: number;
  };
  app_ready: { duration_ms: number; snapshot_applied: boolean };
  legacy_progress_imported: { completed_count: number; favorite_count: number };

  theme_changed: { mode: "light" | "dark" | "system"; high_contrast: boolean };

  donation_purchase_started: { product_id: string };
  donation_purchase_confirmed: {
    product_id: string;
    source: "purchase" | "background";
  };
  donation_purchase_failed: {
    product_id: string | null;
    stage: "store" | "verify";
    reason: string;
  };
};
