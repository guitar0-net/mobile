// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Asset } from "expo-asset";
import { File } from "expo-file-system";

import type { SyncLessonsResponse } from "./api";

export type ContentSnapshot = SyncLessonsResponse & { version: string };

/** Reads the lessons content bundled with the app by `npm run content:snapshot`. */
export async function readSnapshot(): Promise<ContentSnapshot> {
  const asset = await Asset.fromModule(
    require("@/assets/content/lessons.snapshot"),
  ).downloadAsync();
  if (!asset.localUri) throw new Error("Content snapshot has no local file");
  const snapshot = JSON.parse(
    await new File(asset.localUri).text(),
  ) as SyncLessonsResponse;
  if (typeof snapshot.version !== "string") {
    throw new Error("Content snapshot has no version");
  }
  return { ...snapshot, version: snapshot.version };
}
