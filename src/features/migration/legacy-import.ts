// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createMMKV } from "react-native-mmkv";

import { fetchSongIdsByLesson } from "@/features/lessons";
import { addFavorites, completeLessons } from "@/features/settings";
import { capture, captureException } from "@/lib/analytics";

import legacyLessonMap from "./legacy-lesson-map.json";

// Versions up to 4.x kept their whole redux tree under one redux-persist key,
// with every slice stored as its own JSON string inside it.
const LEGACY_ROOT_KEY = "persist:root";
const LEGACY_SLICE = "lessonsettings";

const KEYS = {
  IMPORT_DONE: "migration.legacyImportDone",
  REVIEW_PENDING: "migration.legacyReviewPending",
} as const;

const migrationStorage = createMMKV({ id: "migration" });

export type LegacyImport = {
  completedCount: number;
  favoriteCount: number;
};

// 4.x spelled the completion flag "isComplite" — a typo in the shipped
// storage format, so the key must be matched exactly as it was written.
type LegacyLessonSetting = { isComplite?: boolean; isFavorite?: boolean };

function parseLegacyLessonSettings(raw: string): Record<string, LegacyLessonSetting> {
  const root: unknown = JSON.parse(raw);
  if (typeof root !== "object" || root === null) return {};

  const slice = (root as Record<string, unknown>)[LEGACY_SLICE];
  if (typeof slice !== "string") return {};

  const parsed: unknown = JSON.parse(slice);
  if (typeof parsed !== "object" || parsed === null) return {};

  const settings = (parsed as { settings?: unknown }).settings;
  if (typeof settings !== "object" || settings === null) return {};
  // An array would yield index keys ("0", "1", …) that collide with the pk
  // keys of the map and import a set of lessons shifted by one position.
  if (Array.isArray(settings)) return {};

  return settings as Record<string, LegacyLessonSetting>;
}

function toLessonUuids(
  settings: Record<string, LegacyLessonSetting>,
  field: keyof LegacyLessonSetting,
): string[] {
  const map: Record<string, string> = legacyLessonMap;
  const uuids: string[] = [];
  for (const [legacyPk, setting] of Object.entries(settings)) {
    const uuid = map[legacyPk];
    // A pk with no mapping is content that no longer exists — skipping it is
    // the only sane outcome, and it must not abort the rest of the import.
    if (uuid !== undefined && setting?.[field] === true) uuids.push(uuid);
  }
  return uuids;
}

/**
 * Copies lesson progress and favorites left on the device by version 4.x into
 * the current storage. Requires synced content, since imported lessons are
 * expanded down to their songs. Runs at most once per install; returns what it
 * imported, or null when there was nothing to import. Throws when the 4.x
 * storage or the local content cannot be read; the next launch then retries.
 */
export async function importLegacyProgress(): Promise<LegacyImport | null> {
  if (migrationStorage.getBoolean(KEYS.IMPORT_DONE)) return null;

  const raw = await AsyncStorage.getItem(LEGACY_ROOT_KEY);

  let settings: Record<string, LegacyLessonSetting> = {};
  if (raw !== null) {
    try {
      settings = parseLegacyLessonSettings(raw);
    } catch (error) {
      captureException(error, { stage: "parse_legacy_settings" });
      settings = {};
    }
  }

  const completed = toLessonUuids(settings, "isComplite");
  const favorites = toLessonUuids(settings, "isFavorite");

  let completedCount = 0;
  if (completed.length > 0) {
    const songIdsByLesson = await fetchSongIdsByLesson(completed);

    // "Lesson complete" in 4.x meant the whole lesson, songs included, so it
    // expands into exactly the per-song state the new model derives from.
    const completions = completed.flatMap((lessonId) => {
      const songIds = songIdsByLesson[lessonId];
      return songIds === undefined ? [] : [{ lessonId, songIds }];
    });

    // Not one completed lesson is in the local content: the sync has not
    // brought it in yet, and importing now would mark every lesson complete
    // with an empty song list. Leave the flag unset and retry next launch.
    if (completions.length === 0) return null;

    completeLessons(completions);
    completedCount = completions.length;
  }
  if (favorites.length > 0) addFavorites(favorites);

  migrationStorage.set(KEYS.IMPORT_DONE, true);

  if (completedCount === 0 && favorites.length === 0) return null;

  // The review screen exists to uncheck wrongly imported lessons, so it only
  // earns a stop when something was actually marked complete.
  if (completedCount > 0) migrationStorage.set(KEYS.REVIEW_PENDING, true);

  capture("legacy_progress_imported", {
    completed_count: completedCount,
    favorite_count: favorites.length,
  });

  return { completedCount, favoriteCount: favorites.length };
}

/** True between a successful import and the user confirming the result. */
export function hasPendingLegacyReview(): boolean {
  return migrationStorage.getBoolean(KEYS.REVIEW_PENDING) ?? false;
}

export function markLegacyReviewed(): void {
  migrationStorage.set(KEYS.REVIEW_PENDING, false);
}

export function resetLegacyImport(): void {
  migrationStorage.clearAll();
}
