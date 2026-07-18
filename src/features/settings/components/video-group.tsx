// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { View } from "react-native";

import { SettingsRow } from "@/components/ui/settings-row";
import { Text } from "@/components/ui/text";
import { useDownloadedVideos } from "@/features/lessons";
import { useWifiOnlyDownloads } from "@/features/settings";
import { useColors } from "@/lib/themes";
import { formatMegabytesRu, pluralRu } from "@/lib/utils";

export function VideoGroup() {
  const { wifiOnlyDownloads, setWifiOnlyDownloads } = useWifiOnlyDownloads();
  const { data: downloadedVideos } = useDownloadedVideos();
  const router = useRouter();
  const colors = useColors();

  const totalBytes = (downloadedVideos ?? []).reduce((sum, v) => sum + v.sizeBytes, 0);
  const summary = `${pluralRu(downloadedVideos?.length ?? 0, "урок", "урока", "уроков")} · ${formatMegabytesRu(totalBytes)}`;

  return (
    <>
      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-muted-fg">
        Видео
      </Text>
      <View className="overflow-hidden rounded-xl bg-surface px-4">
        <SettingsRow
          type="toggle"
          icon={{ ios: "wifi", android: "wifi" }}
          iconBgColor={colors.primary}
          label="Скачивать только по Wi-Fi"
          value={wifiOnlyDownloads}
          onChange={setWifiOnlyDownloads}
        />
        <View className="h-px bg-border" />
        <SettingsRow
          type="nav"
          icon={{ ios: "arrow.down.circle", android: "download" }}
          iconBgColor={colors.brandAmber}
          label="Загруженные видео"
          sublabel={summary}
          onPress={() => router.push("/settings/downloaded-videos")}
        />
      </View>
    </>
  );
}
