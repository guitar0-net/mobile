// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

import { storage } from "@/features/settings/storage";

type TunerData = {
  tuningId: string;
  tuningForkEnabled: boolean;
};

type TunerRuntime = {
  detectedFrequency: number | null;
  selectedStringIndex: number | null; // null = auto mode
};

type TunerActions = {
  setTuningId: (id: string) => void;
  setTuningForkEnabled: (enabled: boolean) => void;
  setDetectedFrequency: (freq: number | null) => void;
  setSelectedStringIndex: (index: number | null) => void;
};

export type TunerState = TunerData & TunerRuntime & TunerActions;

const KEYS = {
  TUNING_ID: "tuner.tuningId",
  TUNING_FORK_ENABLED: "tuner.tuningForkEnabled",
} as const;

export const useTunerStore = create<TunerState>((set) => ({
  tuningId: storage.getString(KEYS.TUNING_ID) ?? "standard",
  tuningForkEnabled: storage.getBoolean(KEYS.TUNING_FORK_ENABLED) ?? false,
  detectedFrequency: null,
  selectedStringIndex: null,

  setTuningId: (tuningId) => {
    storage.set(KEYS.TUNING_ID, tuningId);
    set({ tuningId, selectedStringIndex: null });
  },

  setTuningForkEnabled: (tuningForkEnabled) => {
    storage.set(KEYS.TUNING_FORK_ENABLED, tuningForkEnabled);
    set({ tuningForkEnabled });
  },

  setDetectedFrequency: (detectedFrequency) => set({ detectedFrequency }),

  setSelectedStringIndex: (selectedStringIndex) => set({ selectedStringIndex }),
}));
