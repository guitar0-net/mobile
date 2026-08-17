// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting, getDb, initDb } from "@/lib/db";
import { queryClient } from "@/lib/network/query-client";
import { storage } from "@/lib/storage";

import { recordLessonViewed, recordSongCompletion } from "./completion-recorder";
import { getTimelineEvents } from "./db/repository";

beforeEach(async () => {
  _resetDbForTesting();
  storage.clearAll();
  queryClient.clear();
  await initDb();
});

describe("recordLessonViewed", () => {
  test("writes a lesson_video_viewed timeline event with the given title", async () => {
    recordLessonViewed("lesson-1", "Первые аккорды");

    await new Promise((resolve) => setTimeout(resolve, 0));
    const rows = await getTimelineEvents(getDb());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "lesson_video_viewed",
      entityId: "lesson-1",
      title: "Первые аккорды",
    });
  });

  test("invalidates the activity timeline query cache", async () => {
    queryClient.setQueryData(["activity", "timeline"], []);

    recordLessonViewed("lesson-1", "Первые аккорды");
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryClient.getQueryState(["activity", "timeline"])?.isInvalidated).toBe(
      true,
    );
  });
});

describe("recordSongCompletion", () => {
  test("writes a song_completed timeline event when completing", async () => {
    recordSongCompletion("Урок 3", "song-1", "Кукушка", true);

    await new Promise((resolve) => setTimeout(resolve, 0));
    const rows = await getTimelineEvents(getDb());

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: "song_completed",
      entityId: "song-1",
      title: "Кукушка",
      lessonTitle: "Урок 3",
      value: true,
    });
  });

  test("writes an un-completion as its own event rather than deleting the earlier one", async () => {
    recordSongCompletion("Урок 3", "song-1", "Кукушка", true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    recordSongCompletion("Урок 3", "song-1", "Кукушка", false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    const rows = await getTimelineEvents(getDb());

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.value)).toEqual(expect.arrayContaining([true, false]));
  });
});
