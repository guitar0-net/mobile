// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import { chords, initDb } from "@/lib/db";

import { resetDbForTesting } from "./__tests__/testing";
import { fetchAllChords, useAllChords } from "./queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

beforeEach(() => {
  resetDbForTesting();
});

// ---------------------------------------------------------------------------
// fetchAllChords
// ---------------------------------------------------------------------------

describe("fetchAllChords", () => {
  test("returns empty array when no chords exist", async () => {
    await initDb();
    expect(await fetchAllChords()).toEqual([]);
  });

  test("groups chords under the correct note section", async () => {
    const db = await initDb();
    await db.insert(chords).values([
      { id: 1, title: "Am", musicalTitle: "A minor", hasBarre: false },
      { id: 2, title: "Em", musicalTitle: "E minor", hasBarre: false },
    ]);

    const result = await fetchAllChords();
    const notes = result.map((s) => s.note);
    expect(notes).toContain("A");
    expect(notes).toContain("E");

    const aSection = result.find((s) => s.note === "A")!;
    expect(aSection.chords).toHaveLength(1);
    expect(aSection.chords[0].title).toBe("Am");

    const eSection = result.find((s) => s.note === "E")!;
    expect(eSection.chords).toHaveLength(1);
    expect(eSection.chords[0].title).toBe("Em");
  });

  test("sections appear in fixed order C D E F G A H", async () => {
    const db = await initDb();
    await db.insert(chords).values([
      { id: 1, title: "Am", musicalTitle: "A minor", hasBarre: false },
      { id: 2, title: "Gm", musicalTitle: "G minor", hasBarre: false },
      { id: 3, title: "Cm", musicalTitle: "C minor", hasBarre: false },
    ]);

    const result = await fetchAllChords();
    expect(result.map((s) => s.note)).toEqual(["C", "G", "A"]);
  });

  test("omits sections with no chords", async () => {
    const db = await initDb();
    await db
      .insert(chords)
      .values([{ id: 1, title: "Dm", musicalTitle: "D minor", hasBarre: false }]);

    const result = await fetchAllChords();
    expect(result).toHaveLength(1);
    expect(result[0].note).toBe("D");
  });

  test("within a section, chords are sorted by orderInNote ascending, nulls last", async () => {
    const db = await initDb();
    await db.insert(chords).values([
      { id: 1, title: "A", musicalTitle: "A major", hasBarre: false, orderInNote: 3 },
      {
        id: 2,
        title: "Am",
        musicalTitle: "A minor",
        hasBarre: false,
        orderInNote: null,
      },
      {
        id: 3,
        title: "A7",
        musicalTitle: "A seventh",
        hasBarre: false,
        orderInNote: 1,
      },
      {
        id: 4,
        title: "Amaj7",
        musicalTitle: "A major seventh",
        hasBarre: false,
        orderInNote: null,
      },
    ]);

    const result = await fetchAllChords();
    const ids = result[0].chords.map((c) => c.id);
    expect(ids).toEqual([3, 1, 2, 4]);
  });

  test("chords with unrecognised first letter are excluded", async () => {
    const db = await initDb();
    await db.insert(chords).values([
      { id: 1, title: "Bm", musicalTitle: "B minor", hasBarre: false },
      { id: 2, title: "Am", musicalTitle: "A minor", hasBarre: false },
    ]);

    const result = await fetchAllChords();
    const notes = result.map((s) => s.note);
    expect(notes).not.toContain("B");
    expect(notes).toContain("A");
  });
});

// ---------------------------------------------------------------------------
// useAllChords
// ---------------------------------------------------------------------------

describe("useAllChords", () => {
  test("resolves to chord sections after query settles", async () => {
    const db = await initDb();
    await db
      .insert(chords)
      .values([{ id: 1, title: "Am", musicalTitle: "A minor", hasBarre: false }]);

    const { result } = renderHook(() => useAllChords(), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].note).toBe("A");
  });

  test("uses stable query key so multiple instances share cache", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result: r1 } = renderHook(() => useAllChords(), { wrapper: Wrapper });
    const { result: r2 } = renderHook(() => useAllChords(), { wrapper: Wrapper });

    expect(r1.current.status).toBe(r2.current.status);
  });
});
