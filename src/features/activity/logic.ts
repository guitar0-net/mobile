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

export function monthsBackDayKey(from: Date, monthsBack: number): string {
  const year = from.getFullYear();
  const month = from.getMonth() - monthsBack;
  // Clamp instead of letting Date roll overflow days into the next month
  // (e.g. Mar 31 minus 1 month must land on Feb 28/29, not Mar 3).
  const lastDayOfTargetMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(from.getDate(), lastDayOfTargetMonth);
  return localDayKey(new Date(year, month, day));
}

export function enumerateLocalDayKeys(startDate: string, endDate: string): string[] {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = Date.UTC(sy, sm - 1, sd);
  const end = Date.UTC(ey, em - 1, ed);

  const keys: string[] = [];
  for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    keys.push(`${y}-${m}-${day}`);
  }
  return keys;
}

export function intensityBucket(totalSeconds: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (totalSeconds <= 0) return 0;
  if (totalSeconds < 300) return 1;
  if (totalSeconds < 900) return 2;
  if (totalSeconds < 1800) return 3;
  if (totalSeconds < 3600) return 4;
  return 5;
}

export type ActivityDayBucket = { date: string; totalSeconds: number };

export type GridCell = {
  date: string;
  totalSeconds: number;
  bucket: 0 | 1 | 2 | 3 | 4 | 5;
} | null;

// The date key carries no timezone, so day-of-week is derived in UTC —
// consistent with enumerateLocalDayKeys/dayBefore's key-only date math.
function dayOfWeek(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

// Groups a contiguous, chronological run of days into GitHub-style
// Sun-Sat week columns, padding the front of the first and back of the
// last column with null so every column is exactly 7 cells tall.
export function buildGridColumns(history: ActivityDayBucket[]): GridCell[][] {
  if (history.length === 0) return [];

  const columns: GridCell[][] = [];
  let column: GridCell[] = new Array(dayOfWeek(history[0].date)).fill(null);

  for (const day of history) {
    column.push({
      date: day.date,
      totalSeconds: day.totalSeconds,
      bucket: intensityBucket(day.totalSeconds),
    });
    if (column.length === 7) {
      columns.push(column);
      column = [];
    }
  }
  if (column.length > 0) {
    columns.push([...column, ...new Array(7 - column.length).fill(null)]);
  }
  return columns;
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
