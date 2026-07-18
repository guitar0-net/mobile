// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";
import { useMemo } from "react";

import { DownloadedVideosList } from "@/features/lessons";

export default function DownloadedVideosScreen() {
  const screenOptions = useMemo(
    () => ({ title: "Загруженные видео", headerBackTitle: "Настройки" }),
    [],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <DownloadedVideosList />
    </>
  );
}
