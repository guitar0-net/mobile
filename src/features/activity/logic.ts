// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export function localDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfNextLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

export type ActivityChunk = { date: string; seconds: number };

// Splits proportionally so a day's total is never misattributed to the day
// the session merely started or ended on.
export function splitSessionAcrossMidnight(
  startedAt: Date,
  endedAt: Date,
): ActivityChunk[] {
  if (endedAt.getTime() <= startedAt.getTime()) return [];

  const chunks: ActivityChunk[] = [];
  let cursor = startedAt;
  while (cursor.getTime() < endedAt.getTime()) {
    const nextMidnight = startOfNextLocalDay(cursor);
    const chunkEnd =
      nextMidnight.getTime() < endedAt.getTime() ? nextMidnight : endedAt;
    const seconds = Math.round((chunkEnd.getTime() - cursor.getTime()) / 1000);
    if (seconds > 0) chunks.push({ date: localDayKey(cursor), seconds });
    cursor = chunkEnd;
  }
  return chunks;
}

// Calendar-date math on "YYYY-MM-DD" keys — deliberately UTC-based since the
// key itself carries no timezone, so this must not repeat local DST shifts.
function dayBefore(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const prev = new Date(Date.UTC(year, month - 1, day - 1));
  const y = prev.getUTCFullYear();
  const m = String(prev.getUTCMonth() + 1).padStart(2, "0");
  const d = String(prev.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
};

// Call once per active day, in chronological order, when a session's
// activity spans more than one local day.
export function advanceStreak(prev: StreakState, activeDate: string): StreakState {
  if (prev.lastActiveDate === activeDate) return prev;

  const isConsecutiveDay =
    prev.lastActiveDate !== null && dayBefore(activeDate) === prev.lastActiveDate;
  const currentStreak = isConsecutiveDay ? prev.currentStreak + 1 : 1;

  return {
    currentStreak,
    longestStreak: Math.max(prev.longestStreak, currentStreak),
    lastActiveDate: activeDate,
  };
}

// The stored streak only advances/resets on session end, so a day can pass
// with no session at all. This derives what should actually be displayed
// right now, without needing a background job to zero it out proactively.
export function resolveDisplayedStreak(
  currentStreak: number,
  lastActiveDate: string | null,
  today: string,
): number {
  if (lastActiveDate === null) return 0;
  if (lastActiveDate === today || lastActiveDate === dayBefore(today)) {
    return currentStreak;
  }
  return 0;
}
