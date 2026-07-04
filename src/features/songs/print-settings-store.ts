// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

import { storage } from "@/features/settings/storage";

export type Size = 1 | 2 | 3 | 4 | 5;
export type ChordOrientation = "vertical" | "horizontal";

export type PrintSettingsData = {
  showChords: boolean;
  showSchemes: boolean;
  showText: boolean;
  chordOrientation: ChordOrientation;
  chordSize: Size;
  schemeSize: Size;
  textSize: Size;
  columnsCount: 1 | 2 | 3;
};

type PrintSettingsActions = {
  setShowChords: (v: boolean) => void;
  setShowSchemes: (v: boolean) => void;
  setShowText: (v: boolean) => void;
  setChordOrientation: (v: ChordOrientation) => void;
  setChordSize: (v: Size) => void;
  setSchemeSize: (v: Size) => void;
  setTextSize: (v: Size) => void;
  setColumnsCount: (v: 1 | 2 | 3) => void;
};

export type PrintSettingsState = PrintSettingsData & PrintSettingsActions;

export const KEYS = {
  SHOW_CHORDS: "print.showChords",
  SHOW_SCHEMES: "print.showSchemes",
  SHOW_TEXT: "print.showText",
  CHORD_ORIENTATION: "print.chordOrientation",
  CHORD_SIZE: "print.chordSize",
  SCHEME_SIZE: "print.schemeSize",
  TEXT_SIZE: "print.textSize",
  COLUMNS_COUNT: "print.columnsCount",
} as const;

export const PRINT_DEFAULTS: PrintSettingsData = {
  showChords: true,
  showSchemes: true,
  showText: true,
  chordOrientation: "vertical",
  chordSize: 3,
  schemeSize: 3,
  textSize: 3,
  columnsCount: 1,
};

function readSize(key: string, fallback: Size): Size {
  const n = storage.getNumber(key);
  return n !== undefined && n >= 1 && n <= 5 ? (n as Size) : fallback;
}

function readColumnsCount(): 1 | 2 | 3 {
  const n = storage.getNumber(KEYS.COLUMNS_COUNT);
  return n === 1 || n === 2 || n === 3 ? n : PRINT_DEFAULTS.columnsCount;
}

function readChordOrientation(): ChordOrientation {
  const v = storage.getString(KEYS.CHORD_ORIENTATION);
  return v === "vertical" || v === "horizontal" ? v : PRINT_DEFAULTS.chordOrientation;
}

export const usePrintSettingsStore = create<PrintSettingsState>((set) => {
  function makeSetter<K extends keyof PrintSettingsData>(
    stateKey: K,
    storageKey: string,
  ) {
    return (value: PrintSettingsData[K]) => {
      storage.set(storageKey, value as string | number | boolean);
      set({ [stateKey]: value } as unknown as Partial<PrintSettingsState>);
    };
  }

  return {
    showChords: storage.getBoolean(KEYS.SHOW_CHORDS) ?? PRINT_DEFAULTS.showChords,
    showSchemes: storage.getBoolean(KEYS.SHOW_SCHEMES) ?? PRINT_DEFAULTS.showSchemes,
    showText: storage.getBoolean(KEYS.SHOW_TEXT) ?? PRINT_DEFAULTS.showText,
    chordOrientation: readChordOrientation(),
    chordSize: readSize(KEYS.CHORD_SIZE, PRINT_DEFAULTS.chordSize),
    schemeSize: readSize(KEYS.SCHEME_SIZE, PRINT_DEFAULTS.schemeSize),
    textSize: readSize(KEYS.TEXT_SIZE, PRINT_DEFAULTS.textSize),
    columnsCount: readColumnsCount(),

    setShowChords: makeSetter("showChords", KEYS.SHOW_CHORDS),
    setShowSchemes: makeSetter("showSchemes", KEYS.SHOW_SCHEMES),
    setShowText: makeSetter("showText", KEYS.SHOW_TEXT),
    setChordOrientation: makeSetter("chordOrientation", KEYS.CHORD_ORIENTATION),
    setChordSize: makeSetter("chordSize", KEYS.CHORD_SIZE),
    setSchemeSize: makeSetter("schemeSize", KEYS.SCHEME_SIZE),
    setTextSize: makeSetter("textSize", KEYS.TEXT_SIZE),
    setColumnsCount: makeSetter("columnsCount", KEYS.COLUMNS_COUNT),
  };
});
