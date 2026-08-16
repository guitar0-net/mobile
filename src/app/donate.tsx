// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";
import { useMemo } from "react";

import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { DonationTierList } from "@/features/donations";

export default function DonateScreen() {
  const screenOptions = useMemo(
    () => ({ title: "Поддержать проект", headerBackTitle: "Назад" }),
    [],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />

      <ScreenScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-8 pt-4"
      >
        <Text variant="caption" className="mb-4 text-center text-muted-fg">
          Приложение бесплатное и без рекламы. Любой разовый донат помогает развивать
          проект.
        </Text>
        <DonationTierList />
      </ScreenScrollView>
    </>
  );
}
