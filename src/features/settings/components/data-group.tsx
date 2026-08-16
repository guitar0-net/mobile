// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { SettingsGroup } from "@/components/ui/settings-group";
import { SettingsRow } from "@/components/ui/settings-row";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { useDownloadedVideos } from "@/features/lessons";
import { useWifiOnlyDownloads } from "@/features/settings";
import { useAppSync, useSyncState } from "@/lib/sync";
import type { AppSyncDeps } from "@/lib/sync";
import { useColors } from "@/lib/themes";
import { formatMegabytesRu, pluralRu } from "@/lib/utils";

import { formatRelativeTimeRu } from "../format-relative-time-ru";

type DataGroupProps = {
  /** Test-only injection point, mirrors useAppSync's own deps parameter. */
  deps?: Partial<AppSyncDeps>;
};

export function DataGroup({ deps }: DataGroupProps) {
  const { lastSyncedAt } = useSyncState();
  const { status, retry } = useAppSync(deps);
  const [manuallyTriggered, setManuallyTriggered] = useState(false);
  const { wifiOnlyDownloads, setWifiOnlyDownloads } = useWifiOnlyDownloads();
  const { data: downloadedVideos } = useDownloadedVideos();
  const router = useRouter();
  const colors = useColors();

  const isSyncing = manuallyTriggered && status === "loading";
  const hasError = manuallyTriggered && (status === "error" || status === "offline");

  const handleSyncNow = () => {
    setManuallyTriggered(true);
    retry();
  };

  const totalBytes = (downloadedVideos ?? []).reduce((sum, v) => sum + v.sizeBytes, 0);
  const summary = `${pluralRu(downloadedVideos?.length ?? 0, "урок", "урока", "уроков")} · ${formatMegabytesRu(totalBytes)}`;

  return (
    <SettingsGroup title="Данные">
      <View className="flex-row items-center gap-3 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-lg">
          <SymbolView
            name={{ ios: "arrow.triangle.2.circlepath", android: "sync" }}
            size={18}
            tintColor={colors.foreground}
          />
        </View>
        <View className="flex-1">
          <Text>Последняя синхронизация</Text>
          <Text variant="caption">{formatRelativeTimeRu(lastSyncedAt)}</Text>
        </View>
        <Button
          variant="outline"
          size="sm"
          onPress={handleSyncNow}
          disabled={isSyncing}
        >
          {isSyncing ? "Синхронизация…" : "Синхронизировать"}
        </Button>
      </View>
      {hasError && (
        <>
          <View className="h-px bg-border" />
          <View className="items-center gap-2 py-4">
            <StatusMessage variant="error">
              Не удалось синхронизировать. Проверьте подключение к интернету.
            </StatusMessage>
          </View>
        </>
      )}
      <View className="h-px bg-border" />
      <SettingsRow
        type="toggle"
        icon={{ ios: "wifi", android: "wifi" }}
        label="Скачивать только по Wi-Fi"
        value={wifiOnlyDownloads}
        onChange={setWifiOnlyDownloads}
      />
      <View className="h-px bg-border" />
      <SettingsRow
        type="nav"
        icon={{ ios: "arrow.down.circle", android: "download" }}
        label="Загруженные видео"
        sublabel={summary}
        onPress={() => router.push("/settings/downloaded-videos")}
      />
    </SettingsGroup>
  );
}
