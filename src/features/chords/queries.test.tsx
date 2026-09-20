// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { chords, initDb } from "@/lib/db";

import { resetDbForTesting } from "./__tests__/testing";
import {
  fetchChordIndex,
  fetchChordsByTitle,
  fetchChordsCount,
  useChordIndex,
  useChordsByTitle,
} from "./queries";

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

function chord(id: number, title: string, musicalTitle = "") {
  return { id, title, musicalTitle, hasBarre: false };
}

beforeEach(() => {
  resetDbForTesting();
});

describe("fetchChordIndex", () => {
  test("returns empty array when no chords exist", async () => {
    await initDb();
    expect(await fetchChordIndex()).toEqual([]);
  });

  test("splits a title into its note and its variant", async () => {
    const db = await initDb();
    await db.insert(chords).values([chord(1, "A#m7"), chord(2, "Hb")]);

    expect(await fetchChordIndex()).toEqual([
      { note: "A", variants: ["#m7"] },
      { note: "H", variants: ["b"] },
    ]);
  });

  test("notes appear in fixed order C D E F G A H, empty ones omitted", async () => {
    const db = await initDb();
    await db.insert(chords).values([chord(1, "Am"), chord(2, "Gm"), chord(3, "Cm")]);

    expect((await fetchChordIndex()).map((group) => group.note)).toEqual([
      "C",
      "G",
      "A",
    ]);
  });

  test("orders variants by alteration group, rare ones last", async () => {
    const db = await initDb();
    await db
      .insert(chords)
      .values([
        chord(1, "Am/D"),
        chord(2, "A#7"),
        chord(3, "Am7"),
        chord(4, "A"),
        chord(5, "A7/G"),
        chord(6, "A#"),
        chord(7, "A7"),
        chord(8, "Am"),
      ]);

    expect((await fetchChordIndex())[0].variants).toEqual([
      "",
      "m",
      "7",
      "m7",
      "#",
      "#7",
      "7/G",
      "m/D",
    ]);
  });

  test("collapses alternative fingerings of the same chord into one variant", async () => {
    const db = await initDb();
    await db
      .insert(chords)
      .values([chord(1, "C"), chord(2, "C"), chord(3, "C"), chord(4, "Cm")]);

    expect((await fetchChordIndex())[0].variants).toEqual(["", "m"]);
  });

  test("excludes chords whose title does not start with a note", async () => {
    const db = await initDb();
    await db.insert(chords).values([chord(1, "1"), chord(2, "Bm"), chord(3, "Am")]);

    expect(await fetchChordIndex()).toEqual([{ note: "A", variants: ["m"] }]);
  });
});

describe("fetchChordsByTitle", () => {
  test("returns every fingering of that exact title, ordered by id", async () => {
    const db = await initDb();
    await db
      .insert(chords)
      .values([
        chord(5, "C", "до мажор"),
        chord(2, "C", "до мажор"),
        chord(3, "Cm", "до минор"),
      ]);

    const result = await fetchChordsByTitle("C");
    expect(result.map((row) => row.id)).toEqual([2, 5]);
    expect(result[0].musicalTitle).toBe("до мажор");
  });

  test("does not match chords that merely start with the title", async () => {
    const db = await initDb();
    await db.insert(chords).values([chord(1, "A"), chord(2, "Am"), chord(3, "A#")]);

    expect(await fetchChordsByTitle("A")).toHaveLength(1);
  });
});

describe("fetchChordsCount", () => {
  test("counts fingerings but skips titles that are not chords", async () => {
    const db = await initDb();
    await db
      .insert(chords)
      .values([chord(1, "C"), chord(2, "C"), chord(3, "1"), chord(4, "2")]);

    expect(await fetchChordsCount()).toBe(2);
  });
});

describe("useChordIndex", () => {
  test("resolves to the note groups after the query settles", async () => {
    const db = await initDb();
    await db.insert(chords).values([chord(1, "Am")]);

    const { result } = renderHook(() => useChordIndex(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ note: "A", variants: ["m"] }]);
  });
});

describe("useChordsByTitle", () => {
  test("stays idle until a title is selected", async () => {
    await initDb();

    const { result } = renderHook(() => useChordsByTitle(""), {
      wrapper: makeWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });

  test("keeps the previous chord on screen while the next one loads", async () => {
    const db = await initDb();
    await db.insert(chords).values([chord(1, "C"), chord(2, "Cm")]);
    const wrapper = makeWrapper();

    const { result, rerender } = renderHook(
      ({ title }: { title: string }) => useChordsByTitle(title),
      { wrapper, initialProps: { title: "C" } },
    );
    await waitFor(() => expect(result.current.data?.[0].title).toBe("C"));

    rerender({ title: "Cm" });
    expect(result.current.data?.[0].title).toBe("C");

    await waitFor(() => expect(result.current.data?.[0].title).toBe("Cm"));
  });
});
