// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { eq } from "drizzle-orm";

import { chords, getDb, schemes, songChords, songs, songSchemes } from "@/lib/db";

export type SongDetailChord = {
  id: number;
  title: string;
  musicalTitle: string;
  svgHorizontal: string | null;
  svgVertical: string | null;
  startFret: number | null;
  hasBarre: boolean;
  orderInNote: number | null;
};

export type SongDetailScheme = {
  id: number;
  image: string;
  inscription: string | null;
  height: number | null;
  width: number | null;
  localImagePath: string | null;
};

export type SongDetailRow = {
  uuid: string;
  title: string;
  text: string;
  metronome: number;
  chords: SongDetailChord[];
  schemes: SongDetailScheme[];
};

export async function fetchSongDetail(songUuid: string): Promise<SongDetailRow | null> {
  const db = getDb();

  const [song] = await db
    .select({
      uuid: songs.uuid,
      title: songs.title,
      text: songs.text,
      metronome: songs.metronome,
    })
    .from(songs)
    .where(eq(songs.uuid, songUuid));

  if (!song) return null;

  const chordRows = await db
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
    .from(chords)
    .innerJoin(songChords, eq(songChords.chordId, chords.id))
    .where(eq(songChords.songUuid, songUuid));

  const schemeRows = await db
    .select({
      id: schemes.id,
      image: schemes.image,
      inscription: schemes.inscription,
      height: schemes.height,
      width: schemes.width,
      localImagePath: schemes.localImagePath,
    })
    .from(schemes)
    .innerJoin(songSchemes, eq(songSchemes.schemeId, schemes.id))
    .where(eq(songSchemes.songUuid, songUuid));

  return { ...song, chords: chordRows, schemes: schemeRows };
}

export function useSongDetail(songUuid: string) {
  return useQuery({
    queryKey: ["song-detail", songUuid],
    queryFn: () => fetchSongDetail(songUuid),
    enabled: songUuid.length > 0,
  });
}
