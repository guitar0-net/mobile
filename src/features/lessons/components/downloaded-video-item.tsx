// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQueryClient } from "@tanstack/react-query";
import { Alert, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { formatMegabytesRu } from "@/lib/utils";

import { useVideoDownload } from "../use-video-download";

type DownloadedVideoItemProps = {
  lessonUuid: string;
  title: string;
  sizeBytes: number;
};

export function DownloadedVideoItem({
  lessonUuid,
  title,
  sizeBytes,
}: DownloadedVideoItemProps) {
  const { deleteDownload } = useVideoDownload(lessonUuid, "downloaded");
  const queryClient = useQueryClient();

  function handleDeletePress() {
    Alert.alert("Удалить загрузку", "Видео будет удалено с устройства.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          void deleteDownload().then(() =>
            queryClient.invalidateQueries({
              queryKey: ["lessons", "downloaded-videos"],
            }),
          );
        },
      },
    ]);
  }

  return (
    <View className="flex-row items-center gap-3 py-3">
      <View className="flex-1">
        <Text numberOfLines={1}>{title}</Text>
        <Text variant="caption" className="text-muted-fg">
          {formatMegabytesRu(sizeBytes)}
        </Text>
      </View>
      <Button
        variant="ghost"
        size="icon-sm"
        icon={{ ios: "trash", android: "delete" }}
        accessibilityLabel="Удалить загрузку"
        onPress={handleDeletePress}
      />
    </View>
  );
}
