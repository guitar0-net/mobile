// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AsyncStorage from "@react-native-async-storage/async-storage";

import { fetchSongIdsByLesson } from "@/features/lessons";
import { resetLegacyImport } from "@/features/migration";
import legacyLessonMap from "@/features/migration/legacy-lesson-map.json";
import { resetProgress } from "@/features/settings/store";

// Shape written by redux-persist in 4.x: one key holding the whole tree, with
// every slice stored as its own JSON string inside it.
const LEGACY_ROOT_KEY = "persist:root";
const LEGACY_SLICE = "lessonsettings";

const SEEDED_COMPLETED = 5;
const SEEDED_FAVORITES = 3;
// A pk the map does not know — 4.x content that no longer exists.
const UNMAPPED_PK = "999999";

export type LegacySeed = {
  completed: number;
  favorites: number;
};

async function importableLegacyPks(): Promise<string[]> {
  const entries = Object.entries(legacyLessonMap as Record<string, string>);
  let present: Record<string, string[]> = {};
  try {
    present = await fetchSongIdsByLesson(entries.map(([, uuid]) => uuid));
  } catch {
    present = {};
  }

  const importable = entries
    .filter(([, uuid]) => present[uuid] !== undefined)
    .map(([pk]) => pk);

  return importable.length > 0 ? importable : entries.map(([pk]) => pk);
}

/**
 * Writes progress in the 4.x storage format, then clears both the migration
 * flags and the current progress so the next import runs against a clean
 * state and whatever shows up afterwards came from the import.
 */
export async function seedLegacyProgress(): Promise<LegacySeed> {
  const pks = await importableLegacyPks();
  const completed = pks.slice(0, SEEDED_COMPLETED);
  const favorites = pks.slice(SEEDED_COMPLETED, SEEDED_COMPLETED + SEEDED_FAVORITES);

  const settings: Record<string, { isComplete: boolean; isFavorite: boolean }> = {};
  for (const pk of completed) settings[pk] = { isComplete: true, isFavorite: false };
  for (const pk of favorites) settings[pk] = { isComplete: false, isFavorite: true };
  settings[UNMAPPED_PK] = { isComplete: true, isFavorite: true };

  await AsyncStorage.setItem(
    LEGACY_ROOT_KEY,
    JSON.stringify({
      [LEGACY_SLICE]: JSON.stringify({ settings }),
      _persist: JSON.stringify({ version: -1, rehydrated: true }),
    }),
  );

  resetLegacyImport();
  resetProgress();

  return { completed: completed.length, favorites: favorites.length };
}

export async function clearLegacyProgress(): Promise<void> {
  await AsyncStorage.removeItem(LEGACY_ROOT_KEY);
  resetLegacyImport();
}
