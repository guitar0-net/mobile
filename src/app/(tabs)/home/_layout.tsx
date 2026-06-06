// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";

import { useThemedScreenOptions } from "@/lib/themes";

export default function HomeLayout() {
  const screenOptions = useThemedScreenOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ headerShown: false, headerBackTitle: "Главная" }}
      />
      <Stack.Screen
        name="announcements/index"
        options={{ title: "Что нового", headerBackTitle: "Назад" }}
      />
      <Stack.Screen
        name="announcements/[uuid]"
        options={{ title: "", headerBackTitle: "Назад" }}
      />
    </Stack>
  );
}
