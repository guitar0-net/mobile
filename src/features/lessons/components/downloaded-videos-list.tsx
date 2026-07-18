// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { FlatList, View } from "react-native";

import { Text } from "@/components/ui/text";

import { useDownloadedVideos } from "../queries";
import { DownloadedVideoItem } from "./downloaded-video-item";

export function DownloadedVideosList() {
  const { data, isLoading } = useDownloadedVideos();

  if (!isLoading && (!data || data.length === 0)) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-fg">Нет загруженных видео</Text>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="px-4"
      contentInsetAdjustmentBehavior="automatic"
      data={data ?? []}
      keyExtractor={(item) => item.lessonUuid}
      renderItem={({ item }) => (
        <DownloadedVideoItem
          lessonUuid={item.lessonUuid}
          title={item.title}
          sizeBytes={item.sizeBytes}
        />
      )}
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
    />
  );
}
