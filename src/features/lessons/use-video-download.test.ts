// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { createElement } from "react";
import { Alert } from "react-native";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { getDb, initDb, lessons } from "@/lib/db";

import { resetDbForTesting } from "./__tests__/testing";
import { useDownloadStore } from "./download-store";
import { deleteAllDownloadedVideos, useVideoDownload } from "./use-video-download";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDownloadAsync = jest.fn();
const mockCancelAsync = jest.fn();
let capturedProgressCallback:
  | ((data: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void)
  | undefined;

jest.mock("expo-file-system/legacy", () => ({
  documentDirectory: "/mock/documents/",
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn((_, __, ___, callback) => {
    capturedProgressCallback = callback;
    return { downloadAsync: mockDownloadAsync, cancelAsync: mockCancelAsync };
  }),
}));

const mockGetNetworkStateAsync = jest.fn();

jest.mock("expo-network", () => ({
  getNetworkStateAsync: (...args: unknown[]) => mockGetNetworkStateAsync(...args),
  NetworkStateType: { WIFI: "WIFI", CELLULAR: "CELLULAR", NONE: "NONE" },
}));

const mockCapture = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/lib/analytics", () => ({
  capture: (...args: unknown[]) => mockCapture(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

beforeEach(async () => {
  resetDbForTesting();
  resetSettingsForTesting();
  useDownloadStore.setState({ activeDownloads: {}, stalledDownloads: {} });
  capturedProgressCallback = undefined;
  jest.clearAllMocks();
  mockGetNetworkStateAsync.mockResolvedValue({ type: "WIFI" });
  jest.spyOn(Alert, "alert").mockImplementation(() => {});

  const db = await initDb();
  await db.insert(lessons).values({
    uuid: "lesson-1",
    title: "Открытые аккорды",
    videoUrl: "https://youtube.com/watch?v=test",
    updatedAt: "2026-01-01T00:00:00Z",
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("idle → downloading → downloaded on successful download", async () => {
  let resolveDownload!: (v: { uri: string; status: number }) => void;
  mockDownloadAsync.mockReturnValue(
    new Promise<{ uri: string; status: number }>((resolve) => {
      resolveDownload = resolve;
    }),
  );

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  expect(result.current.status).toBe("idle");

  // Start download without awaiting so the hook stays in "downloading"
  act(() => {
    void result.current.startDownload();
  });

  await waitFor(() => expect(result.current.status).toBe("downloading"));

  // Resolve the download and flush all microtasks
  await act(async () => {
    resolveDownload({ uri: "/mock/documents/videos/lesson-1.mp4", status: 200 });
    await Promise.resolve();
  });

  const [row] = await getDb()
    .select({
      videoDownloadStatus: lessons.videoDownloadStatus,
      localVideoPath: lessons.localVideoPath,
    })
    .from(lessons)
    .where(eq(lessons.uuid, "lesson-1"));
  expect(row.videoDownloadStatus).toBe("downloaded");
  expect(row.localVideoPath).toBe("/mock/documents/videos/lesson-1.mp4");
});

test("idle → downloading → failed on download error", async () => {
  const error = new Error("Network error");
  mockDownloadAsync.mockRejectedValue(error);

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  await act(async () => {
    await result.current.startDownload();
  });

  const [row] = await getDb()
    .select({ videoDownloadStatus: lessons.videoDownloadStatus })
    .from(lessons)
    .where(eq(lessons.uuid, "lesson-1"));
  expect(row.videoDownloadStatus).toBe("failed");
  expect(result.current.status).toBe("idle"); // prop still "idle" — DB change reflected via query invalidation in real app
  expect(mockCaptureException).toHaveBeenCalledWith(error, {
    stage: "video_download",
    lesson_id: "lesson-1",
  });
  expect(mockCapture).toHaveBeenCalledWith("video_download_failed", {
    lesson_id: "lesson-1",
    reason: "exception",
    bytes_written: 0,
  });
});

test("marks a non-2xx response as failed without reporting an exception", async () => {
  mockDownloadAsync.mockResolvedValue({
    uri: "/mock/documents/videos/lesson-1.mp4",
    status: 404,
  });

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  await act(async () => {
    await result.current.startDownload();
  });

  const [row] = await getDb()
    .select({ videoDownloadStatus: lessons.videoDownloadStatus })
    .from(lessons)
    .where(eq(lessons.uuid, "lesson-1"));
  expect(row.videoDownloadStatus).toBe("failed");
  expect(mockCapture).toHaveBeenCalledWith("video_download_failed", {
    lesson_id: "lesson-1",
    reason: "http_404",
    bytes_written: 0,
  });
  expect(mockCaptureException).not.toHaveBeenCalled();
});

test("flags a download that stops receiving data without cancelling it", async () => {
  jest.useFakeTimers();
  mockDownloadAsync.mockReturnValue(new Promise(() => {}));

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  act(() => {
    void result.current.startDownload();
  });
  await waitFor(() => expect(result.current.status).toBe("downloading"));

  act(() => {
    capturedProgressCallback?.({
      totalBytesWritten: 16_384,
      totalBytesExpectedToWrite: 50_000_000,
    });
  });
  await act(async () => {
    jest.advanceTimersByTime(14_000);
  });
  expect(result.current.stalled).toBe(false);

  await act(async () => {
    jest.advanceTimersByTime(2_000);
  });
  expect(result.current.stalled).toBe(true);
  expect(result.current.status).toBe("downloading");
  expect(mockCancelAsync).not.toHaveBeenCalled();

  act(() => {
    capturedProgressCallback?.({
      totalBytesWritten: 32_768,
      totalBytesExpectedToWrite: 50_000_000,
    });
  });
  expect(result.current.stalled).toBe(false);
});

test("keeps the stall flag after the stalled download fails, until a retry", async () => {
  jest.useFakeTimers();
  let rejectDownload!: (error: Error) => void;
  mockDownloadAsync.mockReturnValueOnce(
    new Promise((_, reject) => {
      rejectDownload = reject;
    }),
  );

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  act(() => {
    void result.current.startDownload();
  });
  await waitFor(() => expect(result.current.status).toBe("downloading"));
  act(() => {
    capturedProgressCallback?.({
      totalBytesWritten: 16_384,
      totalBytesExpectedToWrite: 50_000_000,
    });
  });
  await act(async () => {
    jest.advanceTimersByTime(60_000);
    rejectDownload(new Error("timeout"));
  });

  await waitFor(() =>
    expect(mockCapture).toHaveBeenCalledWith("video_download_failed", {
      lesson_id: "lesson-1",
      reason: "exception",
      bytes_written: 16_384,
    }),
  );
  expect(result.current.stalled).toBe(true);

  mockDownloadAsync.mockReturnValueOnce(new Promise(() => {}));
  act(() => {
    void result.current.startDownload();
  });
  await waitFor(() => expect(result.current.stalled).toBe(false));
});

test("progress callback updates download percentage", async () => {
  let resolveDownload!: (v: { uri: string; status: number }) => void;
  mockDownloadAsync.mockReturnValue(
    new Promise<{ uri: string; status: number }>((resolve) => {
      resolveDownload = resolve;
    }),
  );

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  act(() => {
    void result.current.startDownload();
  });

  await waitFor(() => expect(result.current.status).toBe("downloading"));

  act(() => {
    capturedProgressCallback?.({
      totalBytesWritten: 500,
      totalBytesExpectedToWrite: 1000,
    });
  });

  expect(result.current.progress).toBe(50);

  await act(async () => {
    resolveDownload({ uri: "/mock/documents/videos/lesson-1.mp4", status: 200 });
  });
});

test("cancelDownload resets status to idle in DB", async () => {
  let resolveDownload!: (v: { uri: string } | undefined) => void;
  mockDownloadAsync.mockReturnValue(
    new Promise<{ uri: string } | undefined>((resolve) => {
      resolveDownload = resolve;
    }),
  );
  mockCancelAsync.mockResolvedValue(undefined);

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  act(() => {
    void result.current.startDownload();
  });
  await waitFor(() => expect(result.current.status).toBe("downloading"));

  // Cancel and then settle the download promise with undefined (real API behavior)
  await act(async () => {
    await result.current.cancelDownload();
    resolveDownload(undefined);
    await Promise.resolve();
  });

  const [row] = await getDb()
    .select({ videoDownloadStatus: lessons.videoDownloadStatus })
    .from(lessons)
    .where(eq(lessons.uuid, "lesson-1"));
  expect(row.videoDownloadStatus).toBe("idle");
  expect(result.current.status).toBe("idle");
});

test("deleteDownload resets status to idle and clears localVideoPath in DB", async () => {
  const db = getDb();
  await db
    .update(lessons)
    .set({
      videoDownloadStatus: "downloaded",
      localVideoPath: "/mock/documents/videos/lesson-1.mp4",
    })
    .where(eq(lessons.uuid, "lesson-1"));

  const { result } = renderHook(() => useVideoDownload("lesson-1", "downloaded"), {
    wrapper: createWrapper(),
  });

  await act(async () => {
    await result.current.deleteDownload();
  });

  const [row] = await getDb()
    .select({
      videoDownloadStatus: lessons.videoDownloadStatus,
      localVideoPath: lessons.localVideoPath,
    })
    .from(lessons)
    .where(eq(lessons.uuid, "lesson-1"));
  expect(row.videoDownloadStatus).toBe("idle");
  expect(row.localVideoPath).toBeNull();
});

test("treats stale downloading DB status as idle", () => {
  // When the app restarts mid-download, DB stays "downloading" but there is no
  // active resumable in the store. The hook must show "idle" so the user can retry.
  const { result } = renderHook(() => useVideoDownload("lesson-1", "downloading"), {
    wrapper: createWrapper(),
  });
  expect(result.current.status).toBe("idle");
});

test("resets stale downloaded status when the local file is missing", async () => {
  // e.g. a backup restore brought back the DB row but not the video file.
  await getDb()
    .update(lessons)
    .set({
      videoDownloadStatus: "downloaded",
      localVideoPath: "/mock/documents/videos/lesson-1.mp4",
    })
    .where(eq(lessons.uuid, "lesson-1"));
  const fileSystem = jest.requireMock<{
    getInfoAsync: jest.Mock;
  }>("expo-file-system/legacy");
  fileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false });

  renderHook(() => useVideoDownload("lesson-1", "downloaded"), {
    wrapper: createWrapper(),
  });

  await waitFor(async () => {
    const [row] = await getDb()
      .select({
        videoDownloadStatus: lessons.videoDownloadStatus,
        localVideoPath: lessons.localVideoPath,
      })
      .from(lessons)
      .where(eq(lessons.uuid, "lesson-1"));
    expect(row).toMatchObject({ videoDownloadStatus: "idle", localVideoPath: null });
  });
});

test("does not start download when wifi-only is enabled on a cellular connection", async () => {
  useSettingsStore.getState().setWifiOnlyDownloads(true);
  mockGetNetworkStateAsync.mockResolvedValue({ type: "CELLULAR" });

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  await act(async () => {
    await result.current.startDownload();
  });

  expect(mockDownloadAsync).not.toHaveBeenCalled();
  expect(result.current.status).toBe("idle");
  expect(Alert.alert).toHaveBeenCalledWith(
    "Нет подключения к Wi-Fi",
    expect.any(String),
  );
});

test("starts download when wifi-only is enabled on a Wi-Fi connection", async () => {
  useSettingsStore.getState().setWifiOnlyDownloads(true);
  mockGetNetworkStateAsync.mockResolvedValue({ type: "WIFI" });
  mockDownloadAsync.mockReturnValue(
    new Promise(() => {
      // never resolves — only needs to have been called
    }),
  );

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  act(() => {
    void result.current.startDownload();
  });

  await waitFor(() => expect(mockDownloadAsync).toHaveBeenCalledTimes(1));
});

test("starts download on a cellular connection when wifi-only is disabled", async () => {
  mockGetNetworkStateAsync.mockResolvedValue({ type: "CELLULAR" });
  mockDownloadAsync.mockReturnValue(
    new Promise(() => {
      // never resolves — only needs to have been called
    }),
  );

  const { result } = renderHook(() => useVideoDownload("lesson-1", "idle"), {
    wrapper: createWrapper(),
  });

  act(() => {
    void result.current.startDownload();
  });

  await waitFor(() => expect(mockDownloadAsync).toHaveBeenCalledTimes(1));
});

describe("deleteAllDownloadedVideos", () => {
  test("deletes every downloaded video's file and resets its DB status, leaving other statuses untouched", async () => {
    const db = getDb();
    await db.insert(lessons).values([
      {
        uuid: "lesson-2",
        title: "Баррэ аккорды",
        videoUrl: "https://youtube.com/watch?v=test2",
        updatedAt: "2026-01-01T00:00:00Z",
        localVideoPath: "/mock/documents/videos/lesson-2.mp4",
        videoDownloadStatus: "downloaded",
      },
      {
        uuid: "lesson-3",
        title: "Перебор",
        videoUrl: "https://youtube.com/watch?v=test3",
        updatedAt: "2026-01-01T00:00:00Z",
        videoDownloadStatus: "failed",
      },
    ]);
    await db
      .update(lessons)
      .set({
        localVideoPath: "/mock/documents/videos/lesson-1.mp4",
        videoDownloadStatus: "downloaded",
      })
      .where(eq(lessons.uuid, "lesson-1"));

    await deleteAllDownloadedVideos();

    const rows = await db
      .select({
        uuid: lessons.uuid,
        videoDownloadStatus: lessons.videoDownloadStatus,
        localVideoPath: lessons.localVideoPath,
      })
      .from(lessons);

    const byId = Object.fromEntries(rows.map((r) => [r.uuid, r]));
    expect(byId["lesson-1"]).toMatchObject({
      videoDownloadStatus: "idle",
      localVideoPath: null,
    });
    expect(byId["lesson-2"]).toMatchObject({
      videoDownloadStatus: "idle",
      localVideoPath: null,
    });
    expect(byId["lesson-3"]).toMatchObject({ videoDownloadStatus: "failed" });

    const FileSystem = jest.requireMock("expo-file-system/legacy") as {
      deleteAsync: jest.Mock;
    };
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "/mock/documents/videos/lesson-1.mp4",
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      "/mock/documents/videos/lesson-2.mp4",
    );
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
  });

  test("does nothing when there are no downloaded videos", async () => {
    await deleteAllDownloadedVideos();

    const [row] = await getDb()
      .select({ videoDownloadStatus: lessons.videoDownloadStatus })
      .from(lessons)
      .where(eq(lessons.uuid, "lesson-1"));
    expect(row.videoDownloadStatus).toBe("idle");

    const FileSystem = jest.requireMock("expo-file-system/legacy") as {
      deleteAsync: jest.Mock;
    };
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
