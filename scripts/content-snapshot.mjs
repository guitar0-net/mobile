// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const SOURCE_URL = "https://api.guitar0.net/api/v1/sync/lessons/";
const OUTPUT_PATH = new URL("../assets/content/lessons.snapshot", import.meta.url)
  .pathname;

function compare(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortBy(items, ...keys) {
  return [...items].sort((a, b) => {
    for (const key of keys) {
      const result = compare(a[key], b[key]);
      if (result !== 0) return result;
    }
    return 0;
  });
}

function sortArrays(data) {
  return {
    ...data,
    lesson_uuids: [...data.lesson_uuids].sort(compare),
    course_uuids: [...data.course_uuids].sort(compare),
    lessons: sortBy(data.lessons, "uuid"),
    songs: sortBy(data.songs, "uuid"),
    courses: sortBy(data.courses, "uuid"),
    chords: sortBy(data.chords, "id"),
    schemes: sortBy(data.schemes, "id"),
    course_lessons: sortBy(data.course_lessons, "course_uuid", "order"),
  };
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`${SOURCE_URL} answered ${response.status}`);
}
const data = await response.json();
if (typeof data.version !== "string" || data.version === "") {
  throw new Error(`${SOURCE_URL} returned no version`);
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(sortArrays(data), null, 2)}\n`);
console.log(`Content snapshot ${data.version} written to ${OUTPUT_PATH}`);
