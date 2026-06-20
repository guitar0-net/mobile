// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// German/Russian notation: H = B natural (si bécarre)
const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "H",
] as const;
export type NoteName = (typeof NOTE_NAMES)[number];

export type TuningString = {
  note: NoteName;
  octave: number;
};

// strings[0] = string 6 (lowest/thickest), strings[5] = string 1 (highest/thinnest)
export type Tuning = {
  id: string;
  label: string;
  shortLabel: string;
  strings: [
    TuningString,
    TuningString,
    TuningString,
    TuningString,
    TuningString,
    TuningString,
  ];
};

// A4 = 440 Hz reference
export function noteFrequency(note: NoteName, octave: number): number {
  const semitone = NOTE_NAMES.indexOf(note) + octave * 12;
  const a4Semitone = NOTE_NAMES.indexOf("A") + 4 * 12;
  return 440 * Math.pow(2, (semitone - a4Semitone) / 12);
}

export function centDeviation(detected: number, target: number): number {
  return 1200 * Math.log2(detected / target);
}

export type NearestString = {
  stringIndex: number; // 0 = string 6, 5 = string 1
  note: NoteName;
  octave: number;
  targetFrequency: number;
  cents: number;
};

export function findNearestString(
  frequency: number,
  tuning: Tuning,
  fixedIndex?: number,
): NearestString {
  const indices =
    fixedIndex !== undefined ? [fixedIndex] : tuning.strings.map((_, i) => i);

  return indices
    .map((i) => {
      const { note, octave } = tuning.strings[i];
      const targetFrequency = noteFrequency(note, octave);
      return {
        stringIndex: i,
        note,
        octave,
        targetFrequency,
        cents: centDeviation(frequency, targetFrequency),
      };
    })
    .reduce((nearest, current) =>
      Math.abs(current.cents) < Math.abs(nearest.cents) ? current : nearest,
    );
}

export const TUNINGS: Tuning[] = [
  {
    id: "standard",
    label: "Стандартный",
    shortLabel: "E A D G H E",
    strings: [
      { note: "E", octave: 2 },
      { note: "A", octave: 2 },
      { note: "D", octave: 3 },
      { note: "G", octave: 3 },
      { note: "H", octave: 3 },
      { note: "E", octave: 4 },
    ],
  },
  {
    id: "drop-d",
    label: "Drop D",
    shortLabel: "D A D G H E",
    strings: [
      { note: "D", octave: 2 },
      { note: "A", octave: 2 },
      { note: "D", octave: 3 },
      { note: "G", octave: 3 },
      { note: "H", octave: 3 },
      { note: "E", octave: 4 },
    ],
  },
  {
    id: "open-g",
    label: "Open G",
    shortLabel: "D G D G H D",
    strings: [
      { note: "D", octave: 2 },
      { note: "G", octave: 2 },
      { note: "D", octave: 3 },
      { note: "G", octave: 3 },
      { note: "H", octave: 3 },
      { note: "D", octave: 4 },
    ],
  },
  {
    id: "half-step-down",
    label: "Полутон вниз",
    shortLabel: "D# G# C# F# A# D#",
    strings: [
      { note: "D#", octave: 2 },
      { note: "G#", octave: 2 },
      { note: "C#", octave: 3 },
      { note: "F#", octave: 3 },
      { note: "A#", octave: 3 },
      { note: "D#", octave: 4 },
    ],
  },
  {
    id: "drop-c",
    label: "Drop C",
    shortLabel: "C G C F A D",
    strings: [
      { note: "C", octave: 2 },
      { note: "G", octave: 2 },
      { note: "C", octave: 3 },
      { note: "F", octave: 3 },
      { note: "A", octave: 3 },
      { note: "D", octave: 4 },
    ],
  },
];
