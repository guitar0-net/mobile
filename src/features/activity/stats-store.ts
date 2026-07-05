// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

import { advanceStreak } from "./logic";
import { storage } from "./storage";

type StatsData = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

type StatsActions = {
  advanceStreakForDay: (activeDate: string) => void;
};

export type ActivityStatsState = StatsData & StatsActions;

const KEYS = {
  CURRENT_STREAK: "activity.currentStreak",
  LONGEST_STREAK: "activity.longestStreak",
  LAST_ACTIVE_DATE: "activity.lastActiveDate",
} as const;

export function readDefaults(): StatsData {
  return {
    currentStreak: storage.getNumber(KEYS.CURRENT_STREAK) ?? 0,
    longestStreak: storage.getNumber(KEYS.LONGEST_STREAK) ?? 0,
    lastActiveDate: storage.getString(KEYS.LAST_ACTIVE_DATE) ?? null,
  };
}

export const useActivityStatsStore = create<ActivityStatsState>((set, get) => ({
  ...readDefaults(),

  advanceStreakForDay: (activeDate) => {
    const { currentStreak, longestStreak, lastActiveDate } = get();
    const next = advanceStreak(
      { currentStreak, longestStreak, lastActiveDate },
      activeDate,
    );

    storage.set(KEYS.CURRENT_STREAK, next.currentStreak);
    storage.set(KEYS.LONGEST_STREAK, next.longestStreak);
    storage.set(KEYS.LAST_ACTIVE_DATE, activeDate);
    set(next);
  },
}));
