// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { deleteAllSchemeImages } from "@/features/lessons/scheme-images";
import {
  chords,
  contentMeta,
  courseLessons,
  courses,
  getDb,
  lessonAdditionLessons,
  lessonSongs,
  lessons,
  schemes,
  songChords,
  songSchemes,
  songs,
} from "@/lib/db";
import { syncStorage } from "@/lib/sync/storage";
import { readDefaults, useSyncStore } from "@/lib/sync/store";

export async function resetAllData(): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(courseLessons);
    await tx.delete(lessonAdditionLessons);
    await tx.delete(lessonSongs);
    await tx.delete(songChords);
    await tx.delete(songSchemes);
    await tx.delete(courses);
    await tx.delete(lessons);
    await tx.delete(songs);
    await tx.delete(chords);
    await tx.delete(schemes);
    await tx.delete(contentMeta);
  });
  deleteAllSchemeImages();
  syncStorage.clearAll();
  useSyncStore.setState(readDefaults());
}

export function resetSyncState(): void {
  getDb().delete(contentMeta).run();
  syncStorage.clearAll();
  useSyncStore.setState(readDefaults());
}
