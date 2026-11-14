// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import {
  chords,
  initDb,
  lessons,
  lessonSongs,
  schemes,
  songChords,
  songs,
  songSchemes,
} from "@/lib/db";
import { createTestQueryClient } from "@/lib/network/__tests__/testing";

import { resetDbForTesting } from "./__tests__/testing";
import { fetchSongDetail, useSongDetail } from "./queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = createTestQueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

async function seedSong() {
  const db = await initDb();

  await db.insert(songs).values({
    uuid: "song-1",
    title: "Smoke on the Water",
    text: "Da da da...",
    chordText: "[Am]Da da da...",
    metronome: 112,
  });
  await db.insert(chords).values([
    {
      id: 1,
      title: "Am",
      musicalTitle: "A minor",
      svgHorizontal: "<svg/>",
      svgVertical: "<svg/>",
      startFret: 1,
      hasBarre: false,
      orderInNote: 1,
    },
    {
      id: 2,
      title: "Em",
      musicalTitle: "E minor",
      svgHorizontal: null,
      svgVertical: null,
      startFret: null,
      hasBarre: false,
      orderInNote: null,
    },
  ]);
  await db.insert(songChords).values([
    { songUuid: "song-1", chordId: 1 },
    { songUuid: "song-1", chordId: 2 },
  ]);
  await db.insert(schemes).values([
    {
      id: 10,
      image: "https://example.com/scheme.png",
      inscription: "Basic pattern",
      height: 200,
      width: 300,
      localImagePath: null,
    },
  ]);
  await db.insert(songSchemes).values({ songUuid: "song-1", schemeId: 10 });
}

beforeEach(() => {
  resetDbForTesting();
});

// ---------------------------------------------------------------------------
// fetchSongDetail
// ---------------------------------------------------------------------------

describe("fetchSongDetail", () => {
  test("returns null for unknown uuid", async () => {
    await initDb();
    expect(await fetchSongDetail("does-not-exist")).toBeNull();
  });

  test("returns basic song fields", async () => {
    await seedSong();
    const result = await fetchSongDetail("song-1");
    expect(result).toMatchObject({
      uuid: "song-1",
      title: "Smoke on the Water",
      text: "Da da da...",
      chordText: "[Am]Da da da...",
      metronome: 112,
    });
  });

  test("returns all chord fields", async () => {
    await seedSong();
    const result = await fetchSongDetail("song-1");
    expect(result?.chords).toHaveLength(2);
    expect(result?.chords).toEqual(
      expect.arrayContaining([
        {
          id: 1,
          title: "Am",
          musicalTitle: "A minor",
          svgHorizontal: "<svg/>",
          svgVertical: "<svg/>",
          startFret: 1,
          hasBarre: false,
          orderInNote: 1,
        },
        {
          id: 2,
          title: "Em",
          musicalTitle: "E minor",
          svgHorizontal: null,
          svgVertical: null,
          startFret: null,
          hasBarre: false,
          orderInNote: null,
        },
      ]),
    );
  });

  test("returns all scheme fields", async () => {
    await seedSong();
    const result = await fetchSongDetail("song-1");
    expect(result?.schemes).toHaveLength(1);
    expect(result?.schemes[0]).toEqual({
      id: 10,
      image: "https://example.com/scheme.png",
      inscription: "Basic pattern",
      height: 200,
      width: 300,
      localImagePath: null,
    });
  });

  test("returns empty chords array when song has no chords", async () => {
    const db = await initDb();
    await db.insert(songs).values({
      uuid: "song-2",
      title: "Bare Song",
      text: "...",
      metronome: 0,
    });
    const result = await fetchSongDetail("song-2");
    expect(result?.chords).toEqual([]);
  });

  test("returns empty schemes array when song has no schemes", async () => {
    const db = await initDb();
    await db.insert(songs).values({
      uuid: "song-3",
      title: "No Schemes",
      text: "...",
      metronome: 80,
    });
    const result = await fetchSongDetail("song-3");
    expect(result?.schemes).toEqual([]);
  });

  test("does not include chords from other songs", async () => {
    await seedSong();
    const db = await initDb();
    await db.insert(songs).values({
      uuid: "song-other",
      title: "Other",
      text: "...",
      metronome: 0,
    });
    await db.insert(chords).values({
      id: 99,
      title: "G",
      musicalTitle: "G major",
      hasBarre: false,
    });
    await db.insert(songChords).values({ songUuid: "song-other", chordId: 99 });

    const result = await fetchSongDetail("song-1");
    expect(result?.chords.every((c) => c.id !== 99)).toBe(true);
  });

  test("returns lessonUuid when song is linked to a lesson", async () => {
    await seedSong();
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "lesson-1",
      title: "Lesson 1",
      videoUrl: "https://example.com/video.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessonSongs).values({ lessonUuid: "lesson-1", songUuid: "song-1" });

    const result = await fetchSongDetail("song-1");
    expect(result?.lessonUuid).toBe("lesson-1");
  });

  test("returns lessonTitle when song is linked to a lesson", async () => {
    await seedSong();
    const db = await initDb();
    await db.insert(lessons).values({
      uuid: "lesson-1",
      title: "Lesson 1",
      videoUrl: "https://example.com/video.mp4",
      updatedAt: "2026-01-01T00:00:00Z",
    });
    await db.insert(lessonSongs).values({ lessonUuid: "lesson-1", songUuid: "song-1" });

    const result = await fetchSongDetail("song-1");
    expect(result?.lessonTitle).toBe("Lesson 1");
  });

  test("returns null lessonTitle when song has no lesson", async () => {
    const db = await initDb();
    await db
      .insert(songs)
      .values({ uuid: "song-solo2", title: "Solo2", text: "...", metronome: 0 });

    const result = await fetchSongDetail("song-solo2");
    expect(result?.lessonTitle).toBeNull();
  });

  test("returns null lessonUuid when song has no lesson", async () => {
    const db = await initDb();
    await db
      .insert(songs)
      .values({ uuid: "song-solo", title: "Solo", text: "...", metronome: 0 });

    const result = await fetchSongDetail("song-solo");
    expect(result?.lessonUuid).toBeNull();
  });

  test("does not include schemes from other songs", async () => {
    await seedSong();
    const db = await initDb();
    await db.insert(songs).values({
      uuid: "song-other",
      title: "Other",
      text: "...",
      metronome: 0,
    });
    await db.insert(schemes).values({
      id: 99,
      image: "https://example.com/other.png",
    });
    await db.insert(songSchemes).values({
      songUuid: "song-other",
      schemeId: 99,
    });

    const result = await fetchSongDetail("song-1");
    expect(result?.schemes.every((s) => s.id !== 99)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useSongDetail
// ---------------------------------------------------------------------------

describe("useSongDetail", () => {
  test("returns song detail after query resolves", async () => {
    await seedSong();
    const { result } = renderHook(() => useSongDetail("song-1"), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.uuid).toBe("song-1");
    expect(result.current.data?.title).toBe("Smoke on the Water");
  });

  test("is disabled when songUuid is empty", () => {
    const { result } = renderHook(() => useSongDetail(""), {
      wrapper: makeWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
  });
});
