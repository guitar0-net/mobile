// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import type { ReactNode } from "react";
import { createElement } from "react";

import { getDb, initDb, lessons } from "@/lib/db";

import { resetDbForTesting } from "./__tests__/testing";
import { useDownloadStore } from "./download-store";
import { useVideoDownload } from "./use-video-download";

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
  useDownloadStore.setState({ activeDownloads: {} });
  capturedProgressCallback = undefined;
  jest.clearAllMocks();

  const db = await initDb();
  await db.insert(lessons).values({
    uuid: "lesson-1",
    title: "Открытые аккорды",
    videoUrl: "https://youtube.com/watch?v=test",
    updatedAt: "2026-01-01T00:00:00Z",
  });
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
  mockDownloadAsync.mockRejectedValue(new Error("Network error"));

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
