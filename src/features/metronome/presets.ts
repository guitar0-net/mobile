// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent, SoundPreset } from "expo-precision-metronome";

export const SOUND_LABELS: Record<SoundPreset, string> = {
  click: "Клик",
  beep: "Бип",
  woodblock: "Деревянный щелчок",
  rim: "Обод",
  hihat: "Хай-хэт",
  cowbell: "Каубелл",
};

export type PresetSize = {
  label: string;
  pattern: BeatAccent[];
};

export const PRESET_SIZES: PresetSize[] = [
  { label: "2/4", pattern: ["strong", "normal"] },
  { label: "3/4", pattern: ["strong", "normal", "normal"] },
  { label: "4/4", pattern: ["strong", "normal", "normal", "normal"] },
  { label: "5/4", pattern: ["strong", "normal", "normal", "strong", "normal"] },
  {
    label: "6/8",
    pattern: ["strong", "normal", "normal", "strong", "normal", "normal"],
  },
  {
    label: "7/8",
    pattern: ["strong", "normal", "strong", "normal", "strong", "normal", "normal"],
  },
];

export function patternsEqual(a: BeatAccent[], b: BeatAccent[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function getSizeName(
  pattern: BeatAccent[],
  savedPatterns: { name: string; beatPattern: BeatAccent[] }[],
): string {
  const preset = PRESET_SIZES.find((p) => patternsEqual(p.pattern, pattern));
  if (preset) return preset.label;
  const saved = savedPatterns.find((s) => patternsEqual(s.beatPattern, pattern));
  if (saved) return saved.name;
  return "Свой размер";
}

const TEMPO_NAMES: { name: string; min: number; max: number }[] = [
  { name: "Ларго", min: 20, max: 59 },
  { name: "Адажио", min: 60, max: 65 },
  { name: "Анданте", min: 66, max: 75 },
  { name: "Модерато", min: 76, max: 107 },
  { name: "Аллегро", min: 108, max: 167 },
  { name: "Престо", min: 168, max: 200 },
  { name: "Престиссимо", min: 201, max: 300 },
];

export function getTempoName(bpm: number): string {
  return TEMPO_NAMES.find((t) => bpm >= t.min && bpm <= t.max)?.name ?? "Модерато";
}
