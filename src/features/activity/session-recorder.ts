// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { AppDb } from "@/lib/db";

import { insertSessionEvent, upsertDailyTotal } from "./db/repository";
import { splitSessionAcrossMidnight, type ActivityChunk } from "./logic";
import { useActivityStatsStore } from "./stats-store";

export async function recordSession(
  db: AppDb,
  deviceId: string,
  startedAt: Date,
  endedAt: Date,
): Promise<ActivityChunk[]> {
  const chunks = splitSessionAcrossMidnight(startedAt, endedAt);
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
