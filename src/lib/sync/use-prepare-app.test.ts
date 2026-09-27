// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";

import type { SnapshotResult } from "@/features/lessons";
import { importLegacyProgress } from "@/features/migration";
import type { AppDb } from "@/lib/db";

import { usePrepareApp } from "./use-prepare-app";
import type { PrepareAppDeps } from "./use-prepare-app";

const mockCapture = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/lib/analytics", () => ({
  capture: (...args: unknown[]) => mockCapture(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const db = {} as AppDb;
const appliedSnapshot: SnapshotResult = {
  applied: true,
  snapshotVersion: "v2",
  previousVersion: null,
  readMs: 12.4,
  writeMs: 480.6,
};

function makeDeps(overrides: Partial<PrepareAppDeps> = {}) {
  return {
    initDb: jest.fn().mockResolvedValue(db),
    applyContentSnapshot: jest.fn().mockResolvedValue(appliedSnapshot),
    importLegacyProgress: jest.fn().mockResolvedValue(undefined),
    runContentSync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } satisfies PrepareAppDeps;
}

beforeEach(() => {
  mockCapture.mockClear();
  mockCaptureException.mockClear();
});

test("becomes ready after writing the snapshot and starts the network sync", async () => {
  const deps = makeDeps();

  const { result } = renderHook(() => usePrepareApp(deps));

  expect(result.current.status).toBe("preparing");
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.snapshotApplied).toBe(true);
  expect(deps.applyContentSnapshot).toHaveBeenCalledWith(db);
  expect(deps.importLegacyProgress).toHaveBeenCalled();
  expect(deps.runContentSync).toHaveBeenCalledWith("launch");
  expect(mockCapture).toHaveBeenCalledWith("content_snapshot_applied", {
    snapshot_version: "v2",
    previous_version: null,
    read_ms: 12,
    write_ms: 481,
  });
});

test("reports nothing when the local content is already newer", async () => {
  const deps = makeDeps({
    applyContentSnapshot: jest
      .fn()
      .mockResolvedValue({ ...appliedSnapshot, applied: false, writeMs: 0 }),
  });

  const { result } = renderHook(() => usePrepareApp(deps));

  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(result.current.snapshotApplied).toBe(false);
  expect(mockCapture).not.toHaveBeenCalled();
});

test("a broken snapshot still lets the app open", async () => {
  const error = new Error("Content snapshot has no version");
  const deps = makeDeps({ applyContentSnapshot: jest.fn().mockRejectedValue(error) });

  const { result } = renderHook(() => usePrepareApp(deps));

  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(mockCaptureException).toHaveBeenCalledWith(error, {
    stage: "content_snapshot",
  });
  expect(deps.runContentSync).toHaveBeenCalledWith("launch");
});

test("a failed legacy import still lets the app open", async () => {
  const error = new Error("corrupt");
  const deps = makeDeps({ importLegacyProgress: jest.fn().mockRejectedValue(error) });

  const { result } = renderHook(() => usePrepareApp(deps));

  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(mockCaptureException).toHaveBeenCalledWith(error, { stage: "legacy_import" });
});

test("unreadable 4.x storage is reported and the app still opens", async () => {
  const error = new Error("database is locked");
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(error);
  const deps = makeDeps({ importLegacyProgress });

  const { result } = renderHook(() => usePrepareApp(deps));

  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(mockCaptureException).toHaveBeenCalledWith(error, { stage: "legacy_import" });
});

test("a database that cannot open keeps its error shown until retry succeeds", async () => {
  const error = new Error("disk I/O error");
  const initDb = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(db);
  const deps = makeDeps({ initDb });

  const { result } = renderHook(() => usePrepareApp(deps));

  await waitFor(() => expect(result.current.status).toBe("db_error"));
  expect(mockCaptureException).toHaveBeenCalledWith(error, { stage: "db_init" });
  expect(deps.applyContentSnapshot).not.toHaveBeenCalled();
  expect(deps.runContentSync).not.toHaveBeenCalled();

  act(() => result.current.retry());

  expect(result.current.status).toBe("db_error");
  await waitFor(() => expect(result.current.status).toBe("ready"));
  expect(initDb).toHaveBeenCalledTimes(2);
});
