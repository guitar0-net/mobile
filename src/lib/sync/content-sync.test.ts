// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { SyncResult } from "@/features/lessons";
import type { AppDb } from "@/lib/db";
import { ApiError } from "@/lib/network";

import { resetSyncForTesting } from "./__tests__/testing";
import { runContentSync } from "./content-sync";
import type { ContentSyncDeps } from "./content-sync";
import { useSyncStore } from "./store";

const mockCapture = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/lib/analytics", () => ({
  capture: (...args: unknown[]) => mockCapture(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

function makeDeps(result: Promise<SyncResult>) {
  return {
    getDb: () => ({}) as AppDb,
    syncAll: jest.fn(() => result),
    invalidateContentQueries: jest.fn(),
    startSchemeImageSync: jest.fn().mockResolvedValue(undefined),
  } satisfies ContentSyncDeps;
}

function capturedEvents(name: string) {
  return mockCapture.mock.calls.filter(([event]) => event === name);
}

beforeEach(() => {
  resetSyncForTesting();
  mockCapture.mockClear();
  mockCaptureException.mockClear();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("concurrent calls share one request", async () => {
  const deps = makeDeps(Promise.resolve({ previousVersion: "v1", version: "v1" }));

  await Promise.all([runContentSync("launch", deps), runContentSync("manual", deps)]);

  expect(deps.syncAll).toHaveBeenCalledTimes(1);
});

test("a new version refreshes queries, reports the change and downloads scheme images", async () => {
  const deps = makeDeps(Promise.resolve({ previousVersion: "v1", version: "v2" }));

  await runContentSync("foreground", deps);

  expect(deps.invalidateContentQueries).toHaveBeenCalledTimes(1);
  expect(deps.startSchemeImageSync).toHaveBeenCalledTimes(1);
  expect(capturedEvents("content_sync_completed")).toEqual([
    [
      "content_sync_completed",
      expect.objectContaining({
        trigger: "foreground",
        previous_version: "v1",
        version: "v2",
      }),
    ],
  ]);
  expect(useSyncStore.getState()).toMatchObject({
    syncStatus: "idle",
    lastSyncedAt: expect.any(Number),
  });
});

test("an unchanged version still refreshes queries but reports nothing", async () => {
  const deps = makeDeps(Promise.resolve({ previousVersion: "v1", version: "v1" }));

  await runContentSync("launch", deps);

  expect(deps.invalidateContentQueries).toHaveBeenCalledTimes(1);
  expect(capturedEvents("content_sync_completed")).toEqual([]);
});

test("a failure marks the sync failed without touching the content", async () => {
  const deps = makeDeps(Promise.reject(new ApiError(500)));

  await runContentSync("network", deps);

  expect(useSyncStore.getState()).toMatchObject({
    syncStatus: "failed",
    lastFailure: expect.objectContaining({ kind: "server" }),
    lastSyncedAt: null,
  });
  expect(deps.invalidateContentQueries).not.toHaveBeenCalled();
  expect(capturedEvents("content_sync_failed")).toEqual([
    [
      "content_sync_failed",
      expect.objectContaining({
        trigger: "network",
        kind: "server",
        error_name: "ApiError",
      }),
    ],
  ]);
  expect(mockCaptureException).toHaveBeenCalledWith(
    expect.any(ApiError),
    expect.objectContaining({ stage: "content_sync" }),
  );
});

test("an offline failure is not reported as an exception", async () => {
  const deps = makeDeps(Promise.reject(new TypeError("Network request failed")));

  await runContentSync("launch", deps);

  expect(useSyncStore.getState().lastFailure?.kind).toBe("offline");
  expect(mockCaptureException).not.toHaveBeenCalled();
});

test("a successful retry clears the failure", async () => {
  await runContentSync("launch", makeDeps(Promise.reject(new ApiError(500))));

  await runContentSync(
    "manual",
    makeDeps(Promise.resolve({ previousVersion: "v1", version: "v1" })),
  );

  expect(useSyncStore.getState()).toMatchObject({
    syncStatus: "idle",
    lastFailure: null,
  });
});
