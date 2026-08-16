// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting, activityDaily, activityEvents, initDb } from "@/lib/db";
import { storage } from "@/lib/storage";

import { insertLessonViewedEvent, upsertDailyTotal } from "./db/repository";
import { resetActivity } from "./reset";

beforeEach(() => {
  _resetDbForTesting();
});

describe("resetActivity", () => {
  test("clears activity_events and activity_daily", async () => {
    const db = await initDb();

    await insertLessonViewedEvent(db, {
      deviceId: "device-1",
      lessonId: "lesson-1",
      title: "Первые аккорды",
      occurredAt: "2026-01-05T10:00:00.000Z",
    });
    await upsertDailyTotal(db, "2026-01-05", 120);

    expect(await db.select().from(activityEvents)).toHaveLength(1);
    expect(await db.select().from(activityDaily)).toHaveLength(1);

    await resetActivity();

    expect(await db.select().from(activityEvents)).toHaveLength(0);
    expect(await db.select().from(activityDaily)).toHaveLength(0);
  });

  test("does not touch the persisted deviceId", async () => {
    await initDb();
    storage.set("activity.deviceId", "device-1");

    await resetActivity();

    expect(storage.getString("activity.deviceId")).toBe("device-1");
  });
});
