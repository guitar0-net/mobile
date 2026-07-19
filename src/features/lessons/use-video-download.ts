// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQueryClient } from "@tanstack/react-query";
import { eq } from "drizzle-orm";
import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";
import { useEffect } from "react";
import { Alert } from "react-native";

import { useWifiOnlyDownloads } from "@/features/settings";
import { getDb, lessons } from "@/lib/db";
import type { VideoDownloadStatus } from "@/lib/db";

import { useDownloadStore } from "./download-store";

export type VideoDownloadHook = {
  status: VideoDownloadStatus;
  progress: number;
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
  const { activeDownloads, setActive, updateProgress, clearActive } =
    useDownloadStore();
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

  useEffect(() => {
    if (dbStatus === "downloading" && !activeDownloads[lessonId]) {
      void getDb()
        .update(lessons)
        .set({ videoDownloadStatus: "idle" })
        .where(eq(lessons.uuid, lessonId));
      void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
      void queryClient.invalidateQueries({
        queryKey: ["lessons", "downloaded-videos"],
      });
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
    const resumable = FileSystem.createDownloadResumable(
      url,
      dest,
      {},
      ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
        if (totalBytesExpectedToWrite > 0) {
          updateProgress(
            lessonId,
            Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100),
          );
        }
      },
    );

    setActive(lessonId, {
      progress: 0,
      cancel: async () => {
        active = false;
        return resumable.cancelAsync();
      },
    });

    try {
      const result = await resumable.downloadAsync();
      if (!active) return;
      if (result && result.status >= 200 && result.status < 300) {
        await getDb()
          .update(lessons)
          .set({ localVideoPath: result.uri, videoDownloadStatus: "downloaded" })
          .where(eq(lessons.uuid, lessonId));
        clearActive(lessonId);
        void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
        void queryClient.invalidateQueries({
          queryKey: ["lessons", "downloaded-videos"],
        });
      } else if (result) {
        await FileSystem.deleteAsync(result.uri, { idempotent: true });
        throw new Error(`HTTP ${result.status}`);
      } else {
        clearActive(lessonId);
      }
    } catch {
      if (!active) return;
      clearActive(lessonId);
      await getDb()
        .update(lessons)
        .set({ videoDownloadStatus: "failed" })
        .where(eq(lessons.uuid, lessonId));
      void queryClient.invalidateQueries({ queryKey: ["lesson-detail", lessonId] });
      void queryClient.invalidateQueries({
        queryKey: ["lessons", "downloaded-videos"],
      });
    }
  }

  async function cancelDownload() {
    const cancel = activeDownloads[lessonId]?.cancel;
    clearActive(lessonId);
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

  return { status, progress, startDownload, cancelDownload, deleteDownload };
}
