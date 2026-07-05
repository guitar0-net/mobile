// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { ActivityGrid, useActivityHistory } from "@/features/activity";

const MONTHS_BACK = 1;

export default function ProgressScreen() {
  const history = useActivityHistory(MONTHS_BACK);

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScreenScrollView className="flex-1" contentContainerClassName="px-4 pb-6">
          <Text variant="heading" className="mb-4 text-4xl">
            Прогресс
          </Text>
          <ActivityGrid history={history} />
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}
