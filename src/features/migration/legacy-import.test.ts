// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AsyncStorage from "@react-native-async-storage/async-storage";

import { resetDbForTesting } from "@/features/lessons/__tests__/testing";
import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { initDb, lessons, lessonSongs, songs } from "@/lib/db";

import {
  hasPendingLegacyReview,
  importLegacyProgress,
  markLegacyReviewed,
  resetLegacyImport,
} from "./legacy-import";

// Real entries from legacy-lesson-map.json — lessons 1 and 2 of the main
// course as they were numbered by the 4.x backend.
const LESSON_1 = "6b341b51-3d69-4087-8a94-67f07dba971e";
const LESSON_2 = "30f4c365-8030-4aab-83f1-b37c8ccf9416";
// Lesson 3 of the same course, deliberately never seeded into the database.
const LESSON_3 = "ee232f88-b3b9-4130-9f48-9d8de9514102";

type LegacySetting = { isComplite?: boolean; isFavorite?: boolean };

function writeLegacyBlob(settings: Record<string, LegacySetting>): Promise<void> {
  return AsyncStorage.setItem(
    "persist:root",
    JSON.stringify({
      theming: JSON.stringify({ theme: "default" }),
      lessonsettings: JSON.stringify({ settings }),
      _persist: JSON.stringify({ version: 1, rehydrated: true }),
    }),
  );
}

async function seedContent() {
  const db = await initDb();

  await db.insert(lessons).values([
    {
      uuid: LESSON_1,
      title: "Знакомство с гитарой",
      videoUrl: "https://example.com/1",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      uuid: LESSON_2,
      title: "Первые аккорды",
      videoUrl: "https://example.com/2",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ]);
  await db.insert(songs).values([
    { uuid: "song-a", title: "Песня A", text: "Am" },
    { uuid: "song-b", title: "Песня B", text: "Em" },
  ]);
  await db.insert(lessonSongs).values([
    { lessonUuid: LESSON_1, songUuid: "song-a" },
    { lessonUuid: LESSON_1, songUuid: "song-b" },
  ]);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  resetDbForTesting();
  resetLegacyImport();
  resetSettingsForTesting();
});

it("expands a lesson completed in 4.x down to its video and every song", async () => {
  await seedContent();
  await writeLegacyBlob({
    "1": { isComplite: true, isFavorite: false },
    "2": { isComplite: false, isFavorite: true },
  });

  const result = await importLegacyProgress();

  expect(result).toEqual({ completedCount: 1, favoriteCount: 1 });
  const { progress, favorites } = useSettingsStore.getState();
  expect(progress[LESSON_1]).toEqual({
    videoViewed: true,
    completedSongIds: ["song-a", "song-b"],
  });
  expect(progress[LESSON_2]).toBeUndefined();
  expect(favorites).toEqual([LESSON_2]);
});

it("completes a lesson that teaches no songs", async () => {
  await seedContent();
  await writeLegacyBlob({ "2": { isComplite: true } });

  await importLegacyProgress();

  expect(useSettingsStore.getState().progress[LESSON_2]).toEqual({
    videoViewed: true,
    completedSongIds: [],
  });
});

it("skips legacy ids that no longer map to a lesson", async () => {
  await seedContent();
  await writeLegacyBlob({
    "1": { isComplite: true },
    "9999": { isComplite: true },
  });

  const result = await importLegacyProgress();

  expect(result).toEqual({ completedCount: 1, favoriteCount: 0 });
  expect(Object.keys(useSettingsStore.getState().progress)).toEqual([LESSON_1]);
});

it("imports once, so progress made after the import is never overwritten", async () => {
  await seedContent();
  await writeLegacyBlob({ "1": { isComplite: true } });
  await importLegacyProgress();

  useSettingsStore
    .getState()
    .setLessonCompletion({ lessonId: LESSON_1, songIds: ["song-a", "song-b"] }, false);
  const second = await importLegacyProgress();

  expect(second).toBeNull();
  expect(useSettingsStore.getState().progress[LESSON_1]).toEqual({
    videoViewed: false,
    completedSongIds: [],
  });
});

it("reports nothing to import on a device with no 4.x data", async () => {
  await seedContent();

  const result = await importLegacyProgress();

  expect(result).toBeNull();
  expect(hasPendingLegacyReview()).toBe(false);
  expect(useSettingsStore.getState().progress).toEqual({});
});

it("treats an unreadable 4.x blob as nothing to import", async () => {
  await seedContent();
  await AsyncStorage.setItem("persist:root", "}{ not json");

  const result = await importLegacyProgress();

  expect(result).toBeNull();
  expect(useSettingsStore.getState().progress).toEqual({});
});

it("retries on the next launch when storage itself fails", async () => {
  await seedContent();
  await writeLegacyBlob({ "1": { isComplite: true } });
  const getItem = AsyncStorage.getItem as jest.Mock;
  const error = new Error("database is locked");
  getItem.mockRejectedValueOnce(error);

  await expect(importLegacyProgress()).rejects.toBe(error);
  expect(useSettingsStore.getState().progress).toEqual({});

  expect(await importLegacyProgress()).toEqual({
    completedCount: 1,
    favoriteCount: 0,
  });
});

it("retries on the next launch when the content is not synced yet", async () => {
  await initDb();
  await writeLegacyBlob({ "1": { isComplite: true } });

  expect(await importLegacyProgress()).toBeNull();
  expect(useSettingsStore.getState().progress).toEqual({});

  await seedContent();

  expect(await importLegacyProgress()).toEqual({
    completedCount: 1,
    favoriteCount: 0,
  });
});

it("retries on the next launch when the database is not ready yet", async () => {
  await writeLegacyBlob({ "1": { isComplite: true } });

  await expect(importLegacyProgress()).rejects.toThrow();
  expect(useSettingsStore.getState().progress).toEqual({});

  await seedContent();

  expect(await importLegacyProgress()).toEqual({
    completedCount: 1,
    favoriteCount: 0,
  });
});

it("skips completed lessons the current content no longer has", async () => {
  await seedContent();
  await writeLegacyBlob({
    "1": { isComplite: true },
    "3": { isComplite: true },
  });

  const result = await importLegacyProgress();

  expect(result).toEqual({ completedCount: 1, favoriteCount: 0 });
  const { progress } = useSettingsStore.getState();
  expect(progress[LESSON_1]).toEqual({
    videoViewed: true,
    completedSongIds: ["song-a", "song-b"],
  });
  expect(progress[LESSON_3]).toBeUndefined();
});

it("ignores a 4.x settings slice stored as an array", async () => {
  await seedContent();
  await writeLegacyBlob([
    { isComplite: true },
    { isComplite: true },
    { isComplite: true },
  ] as unknown as Record<string, LegacySetting>);

  const result = await importLegacyProgress();

  expect(result).toBeNull();
  expect(useSettingsStore.getState().progress).toEqual({});
});

it("ignores the correctly spelled flag 4.x never wrote", async () => {
  await seedContent();
  await writeLegacyBlob({
    "1": { isComplete: true },
  } as unknown as Record<string, LegacySetting>);

  const result = await importLegacyProgress();

  expect(result).toBeNull();
  expect(useSettingsStore.getState().progress).toEqual({});
});

it("skips the review when only favorites were imported", async () => {
  await seedContent();
  await writeLegacyBlob({ "2": { isFavorite: true } });

  const result = await importLegacyProgress();

  expect(result).toEqual({ completedCount: 0, favoriteCount: 1 });
  expect(useSettingsStore.getState().favorites).toEqual([LESSON_2]);
  expect(hasPendingLegacyReview()).toBe(false);
});

it("keeps the review pending until the user confirms it", async () => {
  await seedContent();
  await writeLegacyBlob({ "1": { isComplite: true } });
  await importLegacyProgress();

  expect(hasPendingLegacyReview()).toBe(true);

  markLegacyReviewed();

  expect(hasPendingLegacyReview()).toBe(false);
});
