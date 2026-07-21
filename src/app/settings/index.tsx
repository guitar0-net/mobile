// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";

import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SettingsRow } from "@/components/ui/settings-row";
import { Text } from "@/components/ui/text";
import { useThemePreference } from "@/features/settings";
import { AboutGroup } from "@/features/settings/components/about-group";
import { DangerZoneGroup } from "@/features/settings/components/danger-zone-group";
import { DataGroup } from "@/features/settings/components/data-group";
import { VideoGroup } from "@/features/settings/components/video-group";
import type { ThemeMode } from "@/lib/themes/resolve-theme";

const THEME_MODE_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "Светлая", value: "light" },
  { label: "Тёмная", value: "dark" },
  { label: "Системная", value: "system" },
];

export default function SettingsScreen() {
  const { themeMode, highContrast, setThemeMode, setHighContrast } =
    useThemePreference();

  const screenOptions = useMemo(
    () => ({ title: "Настройки", headerBackTitle: "Назад" }),
    [],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />

      <ScreenScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-8 pt-4"
      >
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-fg">
          Внешний вид
        </Text>
        <View className="overflow-hidden rounded-xl bg-surface px-4">
          <View className="gap-2 py-3">
            <Text>Тема</Text>
            <SegmentedControl
              options={THEME_MODE_OPTIONS}
              value={themeMode}
              onChange={setThemeMode}
            />
          </View>
          <View className="h-px bg-border" />
          <SettingsRow
            type="toggle"
            icon={{ ios: "circle.lefthalf.filled", android: "contrast" }}
            label="Высокая контрастность"
            value={highContrast}
            onChange={setHighContrast}
          />
        </View>
        <DataGroup />
        <VideoGroup />
        <AboutGroup />
        <DangerZoneGroup />
      </ScreenScrollView>
    </>
  );
}
