// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/features/settings/storage";

import { useMetronomeStore } from "../store";

export function resetMetronomeForTesting(): void {
  storage.clearAll();
  useMetronomeStore.setState({
    bpm: 92,
    beatPattern: ["strong", "normal", "normal", "normal"],
    soundPreset: "woodblock",
    screenAwakeEnabled: false,
    savedPatterns: [],
    isPlaying: false,
    currentBeat: -1,
  });
}
