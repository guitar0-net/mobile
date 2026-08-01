// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AppDb } from "@/lib/db";

import { insertSessionEvent, upsertDailyTotal } from "./db/repository";
import { splitSessionAcrossMidnight, type ActivityChunk } from "./logic";
import { useActivityStatsStore } from "./stats-store";

// A device clock jumping forward (manual change, NTP correction, timezone
// travel) must not be able to credit a session with days of activity. This
// caps a single recorded flush regardless of source; it does not belong in
// splitSessionAcrossMidnight, which is a generic — and deliberately
// unbounded — calendar-math utility.
const MAX_SESSION_SECONDS = 12 * 60 * 60;

export async function recordSession(
  db: AppDb,
  deviceId: string,
  startedAt: Date,
  endedAt: Date,
): Promise<ActivityChunk[]> {
  const cappedEndedAt = new Date(
    Math.min(endedAt.getTime(), startedAt.getTime() + MAX_SESSION_SECONDS * 1000),
  );
  const chunks = splitSessionAcrossMidnight(startedAt, cappedEndedAt);
  if (chunks.length === 0) return chunks;

  const durationSeconds = chunks.reduce((sum, chunk) => sum + chunk.seconds, 0);
  await insertSessionEvent(db, {
    deviceId,
    durationSeconds,
    occurredAt: startedAt.toISOString(),
  });

  for (const chunk of chunks) {
    await upsertDailyTotal(db, chunk.date, chunk.seconds);
    useActivityStatsStore.getState().advanceStreakForDay(chunk.date);
  }

  return chunks;
}
