// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, eq, gte, lte, sql } from "drizzle-orm";
import * as Crypto from "expo-crypto";

import { activityDaily, activityEvents, type AppDb } from "@/lib/db";

import { type ActivityDayBucket } from "../logic";

export type SessionEventInput = {
  deviceId: string;
  durationSeconds: number;
  occurredAt: string;
};

export async function insertSessionEvent(
  db: AppDb,
  { deviceId, durationSeconds, occurredAt }: SessionEventInput,
): Promise<void> {
  await db.insert(activityEvents).values({
    id: Crypto.randomUUID(),
    deviceId,
    type: "session",
    durationSeconds,
    occurredAt,
    createdAt: new Date().toISOString(),
  });
}

export async function upsertDailyTotal(
  db: AppDb,
  date: string,
  secondsToAdd: number,
): Promise<void> {
  const updatedAt = new Date().toISOString();

  await db
    .insert(activityDaily)
    .values({ date, totalSeconds: secondsToAdd, updatedAt })
    .onConflictDoUpdate({
      target: activityDaily.date,
      set: {
        totalSeconds: sql`${activityDaily.totalSeconds} + ${secondsToAdd}`,
        updatedAt,
      },
    });
}

export async function getDailyTotals(
  db: AppDb,
  startDate: string,
  endDate: string,
): Promise<ActivityDayBucket[]> {
  return db
    .select({ date: activityDaily.date, totalSeconds: activityDaily.totalSeconds })
    .from(activityDaily)
    .where(and(gte(activityDaily.date, startDate), lte(activityDaily.date, endDate)));
}

export async function getDailyTotal(db: AppDb, date: string): Promise<number> {
  const [row] = await db
    .select({ totalSeconds: activityDaily.totalSeconds })
    .from(activityDaily)
    .where(eq(activityDaily.date, date));

  return row?.totalSeconds ?? 0;
}
