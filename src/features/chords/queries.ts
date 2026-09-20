// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { asc, eq } from "drizzle-orm";

import { chords, getDb } from "@/lib/db";

const NOTE_ORDER = ["C", "D", "E", "F", "G", "A", "H"] as const;
export type Note = (typeof NOTE_ORDER)[number];

const VARIANT_ORDER = [
  "",
  "m",
  "7",
  "m7",
  "#",
  "#m",
  "#7",
  "#m7",
  "b",
  "bm",
  "b7",
  "bm7",
];

const TITLE_PATTERN = /^([CDEFGAH])(.*)$/;

export type ChordRow = {
  id: number;
  title: string;
  musicalTitle: string;
  svgHorizontal: string | null;
  svgVertical: string | null;
};

export type ChordNoteGroup = {
  note: Note;
  variants: string[];
};

function parseTitle(title: string): { note: Note; variant: string } | null {
  const match = TITLE_PATTERN.exec(title);
  if (!match) return null;
  return { note: match[1] as Note, variant: match[2] };
}

function compareVariants(a: string, b: string): number {
  const rankA = VARIANT_ORDER.indexOf(a);
  const rankB = VARIANT_ORDER.indexOf(b);
  if (rankA !== rankB) {
    if (rankA === -1) return 1;
    if (rankB === -1) return -1;
    return rankA - rankB;
  }
  return a.localeCompare(b);
}

export async function fetchChordsCount(): Promise<number> {
  const rows = await getDb().select({ title: chords.title }).from(chords);
  return rows.filter((row) => parseTitle(row.title) !== null).length;
}

/**
 * Notes and their chord variants, without any SVG payload — enough to drive
 * both selector toolbars. `note + variant` is always an existing chord title.
 */
export async function fetchChordIndex(): Promise<ChordNoteGroup[]> {
  const rows = await getDb().select({ title: chords.title }).from(chords);

  const grouped = new Map<Note, Set<string>>();
  for (const row of rows) {
    const parsed = parseTitle(row.title);
    if (!parsed) continue;
    const variants = grouped.get(parsed.note) ?? new Set<string>();
    variants.add(parsed.variant);
    grouped.set(parsed.note, variants);
  }

  return NOTE_ORDER.filter((note) => grouped.has(note)).map((note) => ({
    note,
    variants: [...grouped.get(note)!].sort(compareVariants),
  }));
}

export async function fetchChordsByTitle(title: string): Promise<ChordRow[]> {
  return getDb()
    .select({
      id: chords.id,
      title: chords.title,
      musicalTitle: chords.musicalTitle,
      svgHorizontal: chords.svgHorizontal,
      svgVertical: chords.svgVertical,
    })
    .from(chords)
    .where(eq(chords.title, title))
    .orderBy(asc(chords.id));
}

export function useChordIndex() {
  return useQuery({
    queryKey: ["chords", "index"],
    queryFn: fetchChordIndex,
  });
}

export function useChordsByTitle(title: string) {
  return useQuery({
    queryKey: ["chords", "by-title", title],
    queryFn: () => fetchChordsByTitle(title),
    enabled: title !== "",
    placeholderData: keepPreviousData,
  });
}
