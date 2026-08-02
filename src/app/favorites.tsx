// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";
import { useMemo } from "react";

import { FavoriteLessonsList } from "@/features/lessons";

export default function FavoritesScreen() {
  const screenOptions = useMemo(
    () => ({ title: "Избранное", headerBackTitle: "Назад" }),
    [],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <FavoriteLessonsList />
    </>
  );
}
