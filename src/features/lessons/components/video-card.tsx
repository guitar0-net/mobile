// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { Alert, Linking, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { recordLessonViewed } from "@/features/activity";
import { useProgress } from "@/features/settings";
import type { VideoDownloadStatus } from "@/lib/db";
import { cn } from "@/lib/utils";

import { useVideoDownload } from "../use-video-download";
import { DownloadButton } from "./download-button";

type VideoCardProps = {
  lessonId: string;
  title: string;
  youtubeUrl: string;
  dbDownloadStatus: VideoDownloadStatus;
};

export function VideoCard({
  lessonId,
  title,
  youtubeUrl,
  dbDownloadStatus,
}: VideoCardProps) {
  const router = useRouter();
  const { setVideoViewed } = useProgress();
  const { status, progress, startDownload, cancelDownload, deleteDownload } =
    useVideoDownload(lessonId, dbDownloadStatus);

  const isDownloaded = status === "downloaded";

  function handleDownloadPress() {
    if (status === "downloading") {
      void cancelDownload();
    } else {
      void startDownload();
    }
  }

  function handleDeletePress() {
    Alert.alert("Удалить загрузку", "Видео будет удалено с устройства.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => void deleteDownload() },
    ]);
  }

  return (
    <View className="mt-4">
      <Text
        variant="caption"
        className="text-xs uppercase tracking-wider text-muted-fg"
      >
        Видео урока
      </Text>
      <View className="mt-3 flex-row gap-3">
        <View className="flex-1">
          <Button
            variant="default"
            disabled={!youtubeUrl}
            onPress={() => {
              setVideoViewed(lessonId, true);
              recordLessonViewed(lessonId, title);
              Linking.openURL(youtubeUrl).catch(() => {});
            }}
            icon={{ ios: "play.fill", android: "play_arrow" }}
            className="flex-1 rounded-xl bg-brand-red"
          >
            YouTube
          </Button>
        </View>

        <View className="flex-1">
          <Button
            variant="default"
            disabled={status === "downloading"}
            onPress={() => {
              setVideoViewed(lessonId, true);
              recordLessonViewed(lessonId, title);
              router.push(
                `/video/${lessonId}?source=${isDownloaded ? "offline" : "online"}`,
              );
            }}
            icon={{ ios: "play.fill", android: "play_arrow" }}
            className={cn("flex-1 rounded-xl", isDownloaded && "bg-brand-purple")}
          >
            {isDownloaded ? "Оффлайн" : "Онлайн"}
          </Button>
        </View>

        <DownloadButton
          status={status}
          progress={progress}
          onPress={isDownloaded ? handleDeletePress : handleDownloadPress}
        />
      </View>
    </View>
  );
}
