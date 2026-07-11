// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import * as Crypto from "expo-crypto";

import { activityDaily, activityEvents, type AppDb } from "@/lib/db";

import { type ActivityDayBucket } from "../logic";

export type TimelineEvent = {
  id: string;
  type: "lesson_video_viewed" | "song_completed";
  entityId: string | null;
  title: string | null;
  lessonTitle: string | null;
  value: boolean | null;
  occurredAt: string;
};

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

export type LessonViewedEventInput = {
  deviceId: string;
  lessonId: string;
  title: string;
  occurredAt: string;
};

export async function insertLessonViewedEvent(
  db: AppDb,
  { deviceId, lessonId, title, occurredAt }: LessonViewedEventInput,
): Promise<void> {
  await db.insert(activityEvents).values({
    id: Crypto.randomUUID(),
    deviceId,
    type: "lesson_video_viewed",
    entityId: lessonId,
    title,
    value: true,
    occurredAt,
    createdAt: new Date().toISOString(),
  });
}

export type SongCompletionEventInput = {
  deviceId: string;
  songId: string;
  songTitle: string;
  lessonTitle: string;
  completed: boolean;
  occurredAt: string;
};

export async function insertSongCompletionEvent(
  db: AppDb,
  {
    deviceId,
    songId,
    songTitle,
    lessonTitle,
    completed,
    occurredAt,
  }: SongCompletionEventInput,
): Promise<void> {
  await db.insert(activityEvents).values({
    id: Crypto.randomUUID(),
    deviceId,
    type: "song_completed",
    entityId: songId,
    title: songTitle,
    lessonTitle,
    value: completed,
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

export type TimelineEventsPage = { limit?: number; offset?: number };

export async function getTimelineEvents(
  db: AppDb,
  { limit = 50, offset = 0 }: TimelineEventsPage = {},
): Promise<TimelineEvent[]> {
  const rows = await db
    .select({
      id: activityEvents.id,
      type: activityEvents.type,
      entityId: activityEvents.entityId,
      title: activityEvents.title,
      lessonTitle: activityEvents.lessonTitle,
      value: activityEvents.value,
      occurredAt: activityEvents.occurredAt,
    })
    .from(activityEvents)
    .where(inArray(activityEvents.type, ["lesson_video_viewed", "song_completed"]))
    .orderBy(desc(activityEvents.occurredAt))
    .limit(limit)
    .offset(offset);

  return rows as TimelineEvent[];
}

export async function getDailyTotal(db: AppDb, date: string): Promise<number> {
  const [row] = await db
    .select({ totalSeconds: activityDaily.totalSeconds })
    .from(activityDaily)
    .where(eq(activityDaily.date, date));

  return row?.totalSeconds ?? 0;
}

export async function getAllTimeTotal(db: AppDb): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${activityDaily.totalSeconds}), 0)` })
    .from(activityDaily);

  return row?.total ?? 0;
}
