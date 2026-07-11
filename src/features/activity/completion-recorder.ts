// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getDb } from "@/lib/db";
import { queryClient } from "@/lib/network/query-client";

import { insertLessonViewedEvent, insertSongCompletionEvent } from "./db/repository";
import { getDeviceId } from "./device-id";

function invalidateTimeline(): void {
  void queryClient.invalidateQueries({ queryKey: ["activity", "timeline"] });
}

export function recordLessonViewed(lessonId: string, title: string): void {
  void insertLessonViewedEvent(getDb(), {
    deviceId: getDeviceId(),
    lessonId,
    title,
    occurredAt: new Date().toISOString(),
  }).then(invalidateTimeline);
}

export function recordSongCompletion(
  lessonTitle: string,
  songId: string,
  songTitle: string,
  completed: boolean,
): void {
  void insertSongCompletionEvent(getDb(), {
    deviceId: getDeviceId(),
    songId,
    songTitle,
    lessonTitle,
    completed,
    occurredAt: new Date().toISOString(),
  }).then(invalidateTimeline);
}
