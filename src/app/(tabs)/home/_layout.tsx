// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack>
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
