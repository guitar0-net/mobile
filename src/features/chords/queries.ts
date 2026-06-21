// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { count } from "drizzle-orm";

import { chords, getDb } from "@/lib/db";

export async function fetchChordsCount(): Promise<number> {
  const result = await getDb().select({ count: count() }).from(chords);
  return result[0]?.count ?? 0;
}

const NOTE_ORDER = ["C", "D", "E", "F", "G", "A", "H"] as const;
type Note = (typeof NOTE_ORDER)[number];

export type ChordRow = {
  id: number;
  title: string;
  musicalTitle: string;
  svgHorizontal: string | null;
  svgVertical: string | null;
  startFret: number | null;
  hasBarre: boolean;
  orderInNote: number | null;
};

export type ChordSection = {
  note: Note;
  chords: ChordRow[];
};

export async function fetchAllChords(): Promise<ChordSection[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: chords.id,
      title: chords.title,
      musicalTitle: chords.musicalTitle,
      svgHorizontal: chords.svgHorizontal,
      svgVertical: chords.svgVertical,
      startFret: chords.startFret,
      hasBarre: chords.hasBarre,
      orderInNote: chords.orderInNote,
    })
    .from(chords);

  const grouped = new Map<Note, ChordRow[]>();
  for (const row of rows) {
    const note = row.title[0]?.toUpperCase() as Note;
    if (!NOTE_ORDER.includes(note)) continue;
    if (!grouped.has(note)) grouped.set(note, []);
    grouped.get(note)!.push(row);
  }

  for (const sectionChords of grouped.values()) {
    sectionChords.sort((a, b) => {
      if (a.orderInNote === null && b.orderInNote === null) return 0;
      if (a.orderInNote === null) return 1;
      if (b.orderInNote === null) return -1;
      return a.orderInNote - b.orderInNote;
    });
  }

  return NOTE_ORDER.filter((note) => grouped.has(note)).map((note) => ({
    note,
    chords: grouped.get(note)!,
  }));
}

export function useAllChords() {
  return useQuery({
    queryKey: ["all-chords"],
    queryFn: fetchAllChords,
  });
}
