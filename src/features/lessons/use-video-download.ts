// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQueryClient } from "@tanstack/react-query";
import { eq, inArray } from "drizzle-orm";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";
import { useEffect } from "react";
import { Alert, AppState } from "react-native";

import { useWifiOnlyDownloads } from "@/features/settings";
import { capture, captureException } from "@/lib/analytics";
import { getDb, lessons } from "@/lib/db";
import type { VideoDownloadStatus } from "@/lib/db";
import { queryClient as appQueryClient } from "@/lib/network/query-client";

import { useDownloadStore } from "./download-store";

const STALL_TIMEOUT_MS = 15_000;
const STALL_CHECK_INTERVAL_MS = 1_000;

export type VideoDownloadHook = {
  status: VideoDownloadStatus;
  progress: number;
  stalled: boolean;
  startDownload: () => Promise<void>;
  cancelDownload: () => Promise<void>;
  deleteDownload: () => Promise<void>;
};

export function videoStreamUrl(lessonId: string): string {
  return `${process.env.EXPO_PUBLIC_API_URL}/videos/${lessonId}.mp4`;
}

function videoDestPath(lessonId: string): string {
  return `${FileSystem.documentDirectory}videos/${lessonId}.mp4`;
}

export function useVideoDownload(
  lessonId: string,
  dbStatus: VideoDownloadStatus,
): VideoDownloadHook {
  const {
    activeDownloads,
    stalledDownloads,
    setActive,
    updateProgress,
    clearActive,
    setStalled,
  } = useDownloadStore();
  const { wifiOnlyDownloads } = useWifiOnlyDownloads();
  const queryClient = useQueryClient();

  const activeEntry = activeDownloads[lessonId];
  const isActuallyDownloading = Boolean(activeEntry);

  let status: VideoDownloadStatus;
  if (isActuallyDownloading) {
    status = "downloading";
  } else if (dbStatus === "downloading") {
    // DB stuck in downloading from a previous interrupted session — treat as idle.
    status = "idle";
  } else {
    status = dbStatus;
  }

  const progress = activeEntry?.progress ?? 0;
  const stalled = stalledDownloads[lessonId] ?? false;

  function invalidateDownloadQueries() {
    void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
    void queryClient.invalidateQueries({ queryKey: ["lessons", "downloaded-videos"] });
  }

  useEffect(() => {
    if (dbStatus === "downloading" && !activeDownloads[lessonId]) {
      void getDb()
        .update(lessons)
        .set({ videoDownloadStatus: "idle" })
        .where(eq(lessons.uuid, lessonId));
      invalidateDownloadQueries();
    }

    if (dbStatus === "downloaded") {
      // The DB can claim "downloaded" while the file is gone — e.g. a backup
      // restore brought back the DB row but not the (larger, possibly
      // backup-excluded) video file, or the download was interrupted after
      // the file write but before cleanup ran.
      void (async () => {
        const [lesson] = await getDb()
          .select({ localVideoPath: lessons.localVideoPath })
          .from(lessons)
          .where(eq(lessons.uuid, lessonId));
        const info = lesson?.localVideoPath
          ? await FileSystem.getInfoAsync(lesson.localVideoPath)
          : null;
        if (!info?.exists) {
          await getDb()
            .update(lessons)
            .set({ localVideoPath: null, videoDownloadStatus: "idle" })
            .where(eq(lessons.uuid, lessonId));
          invalidateDownloadQueries();
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cleanup stale download state on mount only
  }, [lessonId]);

  async function startDownload() {
    if (wifiOnlyDownloads) {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.type !== Network.NetworkStateType.WIFI) {
        Alert.alert(
          "Нет подключения к Wi-Fi",
          "Включена загрузка видео только по Wi-Fi. Подключитесь к сети Wi-Fi или отключите этот параметр в настройках.",
        );
        return;
      }
    }

    const url = videoStreamUrl(lessonId);
    const dest = videoDestPath(lessonId);

    const videosDir = `${FileSystem.documentDirectory}videos/`;
    const dirInfo = await FileSystem.getInfoAsync(videosDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(videosDir, { intermediates: true });
    }

    let active = true;
    let isStalled = false;
    let bytesWritten = 0;
    let lastProgressAt = Date.now();
    const resumable = FileSystem.createDownloadResumable(
      url,
      dest,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        bytesWritten = totalBytesWritten;
        lastProgressAt = Date.now();
        if (isStalled) {
          isStalled = false;
          setStalled(lessonId, false);
        }
        if (totalBytesExpectedToWrite > 0) {
          updateProgress(
            lessonId,
            Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100),
          );
        }
      },
    );

    capture("video_download_started", { lesson_id: lessonId });
    setStalled(lessonId, false);

    setActive(lessonId, {
      progress: 0,
      cancel: async () => {
        active = false;
        return resumable.cancelAsync();
      },
    });

    // JS timers are suspended in the background while the native download goes on.
    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state === "active") lastProgressAt = Date.now();
    });
    const stallWatchdog = setInterval(() => {
      if (isStalled || Date.now() - lastProgressAt < STALL_TIMEOUT_MS) return;
      isStalled = true;
      setStalled(lessonId, true);
    }, STALL_CHECK_INTERVAL_MS);

    let failureReason: `http_${number}` | "exception";
    try {
      const result = await resumable.downloadAsync();
      if (!active) return;
      if (!result) {
        clearActive(lessonId);
        return;
      }
      if (result.status >= 200 && result.status < 300) {
        await getDb()
          .update(lessons)
          .set({ localVideoPath: result.uri, videoDownloadStatus: "downloaded" })
          .where(eq(lessons.uuid, lessonId));
        clearActive(lessonId);
        capture("video_download_completed", { lesson_id: lessonId });
        void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
        void queryClient.invalidateQueries({
          queryKey: ["lessons", "downloaded-videos"],
        });
        return;
      }
      await FileSystem.deleteAsync(result.uri, { idempotent: true });
      failureReason = `http_${result.status}`;
    } catch (error) {
      if (!active) return;
      captureException(error, { stage: "video_download", lesson_id: lessonId });
      failureReason = "exception";
    } finally {
      clearInterval(stallWatchdog);
      appStateSubscription.remove();
    }

    clearActive(lessonId);
    capture("video_download_failed", {
      lesson_id: lessonId,
      reason: failureReason,
      bytes_written: bytesWritten,
    });
    await getDb()
      .update(lessons)
      .set({ videoDownloadStatus: "failed" })
      .where(eq(lessons.uuid, lessonId));
    void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
    void queryClient.invalidateQueries({
      queryKey: ["lessons", "downloaded-videos"],
    });
  }

  async function cancelDownload() {
    const cancel = activeDownloads[lessonId]?.cancel;
    clearActive(lessonId);
    setStalled(lessonId, false);
    await cancel?.();
    await getDb()
      .update(lessons)
      .set({ videoDownloadStatus: "idle" })
      .where(eq(lessons.uuid, lessonId));
    void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
    void queryClient.invalidateQueries({ queryKey: ["lessons", "downloaded-videos"] });
  }

  async function deleteDownload() {
    const db = getDb();
    const [lesson] = await db
      .select({ localVideoPath: lessons.localVideoPath })
      .from(lessons)
      .where(eq(lessons.uuid, lessonId));

    try {
      if (lesson?.localVideoPath) {
        const info = await FileSystem.getInfoAsync(lesson.localVideoPath);
        if (info.exists) await FileSystem.deleteAsync(lesson.localVideoPath);
      }
    } finally {
      await db
        .update(lessons)
        .set({ localVideoPath: null, videoDownloadStatus: "idle" })
        .where(eq(lessons.uuid, lessonId));
      void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
      void queryClient.invalidateQueries({
        queryKey: ["lessons", "downloaded-videos"],
      });
    }
  }

  return { status, progress, stalled, startDownload, cancelDownload, deleteDownload };
}

export async function deleteAllDownloadedVideos(): Promise<void> {
  const db = getDb();
  const downloaded = await db
    .select({ uuid: lessons.uuid, localVideoPath: lessons.localVideoPath })
    .from(lessons)
    .where(eq(lessons.videoDownloadStatus, "downloaded"));

  if (downloaded.length === 0) return;

  for (const lesson of downloaded) {
    if (!lesson.localVideoPath) continue;
    const info = await FileSystem.getInfoAsync(lesson.localVideoPath);
    if (info.exists) await FileSystem.deleteAsync(lesson.localVideoPath);
  }

  await db
    .update(lessons)
    .set({ localVideoPath: null, videoDownloadStatus: "idle" })
    .where(
      inArray(
        lessons.uuid,
        downloaded.map((lesson) => lesson.uuid),
      ),
    );
  void appQueryClient.invalidateQueries({ queryKey: ["lesson-detail"] });
  void appQueryClient.invalidateQueries({ queryKey: ["lessons", "downloaded-videos"] });
}
