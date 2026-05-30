// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { NativeTabs } from "expo-router/unstable-native-tabs";

export default function AppTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" md="home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="lessons">
        <NativeTabs.Trigger.Label>Lessons</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="music.note.list" md="library_music" />
      </NativeTabs.Trigger>

      {__DEV__ && (
        <NativeTabs.Trigger name="dev">
          <NativeTabs.Trigger.Label>Dev</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="wrench.and.screwdriver.fill" md="build" />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
