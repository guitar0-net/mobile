// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { getContentVersion } from "@/features/lessons";
import { capture } from "@/lib/analytics";
import { getDb } from "@/lib/db";
import { getDeviceId } from "@/lib/device-id";
import { ApiError, apiPostJson } from "@/lib/network";
import type { components } from "@/lib/network/api.types";

import { storage } from "./storage";

type ReportPayload = components["schemas"]["ReportCreateRequestRequest"];

export type ReportTarget = { type: "song" | "lesson"; id: string } | { type: "app" };

export type ReportSource = "song_footer" | "lesson_footer" | "video_error" | "settings";

export type ReportDraft = {
  target: ReportTarget;
  reason: string;
  message: string;
  contactEmail?: string;
  screen: string;
  source: ReportSource;
};

type PendingReport = { createdAt: number; payload: ReportPayload };

const QUEUE_KEY = "queue";
const MAX_QUEUE_LENGTH = 50;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const REJECTED_STATUSES = new Set([400, 413, 415, 422]);

function readQueue(): PendingReport[] {
  const raw = storage.getString(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as PendingReport[]) : [];
}

function writeQueue(queue: PendingReport[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

function buildPayload(draft: ReportDraft): ReportPayload {
  return {
    id: Crypto.randomUUID(),
    target_type: draft.target.type,
    target_id: draft.target.type === "app" ? "" : draft.target.id,
    content_version: getContentVersion(getDb()),
    reason: draft.reason,
    message: draft.message,
    ...(draft.contactEmail && { contact_email: draft.contactEmail }),
    device_id: getDeviceId(),
    platform: Platform.OS === "ios" ? "ios" : "android",
    app_version: Constants.expoConfig?.version ?? "",
    os_version: String(Platform.Version),
    locale: Intl.DateTimeFormat().resolvedOptions().locale,
    screen: draft.screen,
  };
}

export function submitReport(draft: ReportDraft, network: { offline: boolean }): void {
  const queue = [
    ...readQueue(),
    { createdAt: Date.now(), payload: buildPayload(draft) },
  ];
  const overflow = queue.length - MAX_QUEUE_LENGTH;
  writeQueue(queue.slice(Math.max(overflow, 0)));
  for (let i = 0; i < overflow; i++)
    capture("report_dropped", { reason: "queue_full" });
  capture("report_submitted", {
    target_type: draft.target.type,
    reason: draft.reason,
    source: draft.source,
    queued: network.offline,
  });
  void flushPendingReports();
}

let activeFlush: Promise<void> | null = null;

export function flushPendingReports(): Promise<void> {
  activeFlush ??= flush().finally(() => {
    activeFlush = null;
  });
  return activeFlush;
}

async function flush(): Promise<void> {
  dropExpired();
  for (let report = readQueue()[0]; report; report = readQueue()[0]) {
    try {
      await apiPostJson("/api/v1/reports/", report.payload);
    } catch (error) {
      if (!(error instanceof ApiError && REJECTED_STATUSES.has(error.status))) return;
      capture("report_dropped", { reason: "rejected", status: error.status });
    }
    removeFromQueue(report.payload.id);
  }
}

function removeFromQueue(id: string): void {
  writeQueue(readQueue().filter((report) => report.payload.id !== id));
}

function dropExpired(): void {
  const queue = readQueue();
  const fresh = queue.filter((report) => Date.now() - report.createdAt <= MAX_AGE_MS);
  if (fresh.length === queue.length) return;
  writeQueue(fresh);
  for (let i = fresh.length; i < queue.length; i++)
    capture("report_dropped", { reason: "expired" });
}
