// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent, SoundPreset } from "expo-precision-metronome";
import { create } from "zustand";

import { storage } from "@/features/settings/storage";

export const BPM_MIN = 20;
export const BPM_MAX = 300;

export type SavedPattern = { name: string; beatPattern: BeatAccent[] };

type MetronomeData = {
  bpm: number;
  beatPattern: BeatAccent[];
  soundPreset: SoundPreset;
  screenAwakeEnabled: boolean;
  savedPatterns: SavedPattern[];
};

type MetronomeRuntime = {
  isPlaying: boolean;
  currentBeat: number;
};

type MetronomeActions = {
  setBpm: (bpm: number) => void;
  setBeatPattern: (pattern: BeatAccent[]) => void;
  setSoundPreset: (preset: SoundPreset) => void;
  setScreenAwakeEnabled: (enabled: boolean) => void;
  saveCurrentPattern: (name: string) => void;
  deleteSavedPattern: (index: number) => void;
  renameSavedPattern: (index: number, name: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentBeat: (beat: number) => void;
};

export type MetronomeState = MetronomeData & MetronomeRuntime & MetronomeActions;

const KEYS = {
  BPM: "metronome.bpm",
  BEAT_PATTERN: "metronome.beatPattern",
  SOUND_PRESET: "metronome.soundPreset",
  SCREEN_AWAKE: "metronome.screenAwake",
  SAVED_PATTERNS: "metronome.savedPatterns",
} as const;

const DEFAULT_PATTERN: BeatAccent[] = ["strong", "normal", "normal", "normal"];

function tryParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function clampBpm(bpm: number): number {
  return Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(bpm)));
}

export const useMetronomeStore = create<MetronomeState>((set, get) => ({
  bpm: clampBpm(storage.getNumber(KEYS.BPM) ?? 92),
  beatPattern: tryParse<BeatAccent[]>(
    storage.getString(KEYS.BEAT_PATTERN),
    DEFAULT_PATTERN,
  ),
  soundPreset:
    (storage.getString(KEYS.SOUND_PRESET) as SoundPreset | undefined) ?? "woodblock",
  screenAwakeEnabled: storage.getBoolean(KEYS.SCREEN_AWAKE) ?? true,
  savedPatterns: tryParse<SavedPattern[]>(storage.getString(KEYS.SAVED_PATTERNS), []),
  isPlaying: false,
  currentBeat: -1,

  setBpm: (rawBpm) => {
    const bpm = clampBpm(rawBpm);
    storage.set(KEYS.BPM, bpm);
    set({ bpm });
  },

  setBeatPattern: (beatPattern) => {
    storage.set(KEYS.BEAT_PATTERN, JSON.stringify(beatPattern));
    set({ beatPattern });
  },

  setSoundPreset: (soundPreset) => {
    storage.set(KEYS.SOUND_PRESET, soundPreset);
    set({ soundPreset });
  },

  setScreenAwakeEnabled: (screenAwakeEnabled) => {
    storage.set(KEYS.SCREEN_AWAKE, screenAwakeEnabled);
    set({ screenAwakeEnabled });
  },

  saveCurrentPattern: (name) => {
    const { beatPattern, savedPatterns } = get();
    const updated = [...savedPatterns, { name: name.trim(), beatPattern }];
    storage.set(KEYS.SAVED_PATTERNS, JSON.stringify(updated));
    set({ savedPatterns: updated });
  },

  deleteSavedPattern: (index) => {
    const savedPatterns = get().savedPatterns.filter((_, i) => i !== index);
    storage.set(KEYS.SAVED_PATTERNS, JSON.stringify(savedPatterns));
    set({ savedPatterns });
  },

  renameSavedPattern: (index, name) => {
    const savedPatterns = get().savedPatterns.map((s, i) =>
      i === index ? { ...s, name: name.trim() } : s,
    );
    storage.set(KEYS.SAVED_PATTERNS, JSON.stringify(savedPatterns));
    set({ savedPatterns });
  },

  setIsPlaying: (isPlaying) => {
    set(isPlaying ? { isPlaying } : { isPlaying, currentBeat: -1 });
  },

  setCurrentBeat: (currentBeat) => set({ currentBeat }),
}));
