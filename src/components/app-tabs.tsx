// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useColors } from "@/lib/themes";

export default function AppTabs() {
  const colors = useColors();
  const contentStyle = { backgroundColor: colors.background };

  return (
    <NativeTabs
      backgroundColor={colors.surface}
      tintColor={colors.primary}
      disableTransparentOnScrollEdge
    >
      <NativeTabs.Trigger name="home" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Главная</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="lessons" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Уроки</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress" contentStyle={contentStyle}>
        <NativeTabs.Trigger.Label>Профиль</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.fill" md="person" />
      </NativeTabs.Trigger>

      {__DEV__ && (
        <NativeTabs.Trigger name="dev" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Label>Разработка</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="wrench.and.screwdriver.fill" md="build" />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
