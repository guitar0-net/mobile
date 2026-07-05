// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useColors } from "@/lib/themes";

export default function AppTabs() {
  const colors = useColors();
  const contentStyle = { backgroundColor: colors.background };

  return (
    <NativeTabs backgroundColor={colors.surface} disableTransparentOnScrollEdge>
      <NativeTabs.Trigger name="home" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="lessons" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Lessons</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="music.note.list" md="library_music" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="flame.fill" md="local_fire_department" />
      </NativeTabs.Trigger>

      {__DEV__ && (
        <NativeTabs.Trigger name="dev" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Label>Dev</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="wrench.and.screwdriver.fill" md="build" />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
