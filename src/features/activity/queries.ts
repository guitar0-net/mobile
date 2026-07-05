// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";

import { getDb } from "@/lib/db";

import { getDailyTotal } from "./db/repository";
import { localDayKey, resolveDisplayedStreak } from "./logic";
import { useActivityStatsStore } from "./stats-store";

export function useActivityStreak() {
  const { currentStreak, longestStreak, lastActiveDate } = useActivityStatsStore(
    useShallow((s) => ({
      currentStreak: s.currentStreak,
      longestStreak: s.longestStreak,
      lastActiveDate: s.lastActiveDate,
    })),
  );

  const today = localDayKey(new Date());
  const dailyTotalQuery = useQuery({
    queryKey: ["activity", "dailyTotal", today],
    queryFn: () => getDailyTotal(getDb(), today),
  });

  return {
    currentStreak: resolveDisplayedStreak(currentStreak, lastActiveDate, today),
    longestStreak,
    todaySeconds: dailyTotalQuery.data ?? 0,
  };
}
