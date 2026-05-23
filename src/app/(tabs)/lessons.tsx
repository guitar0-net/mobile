// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LessonsScreen() {
  return (
    <View className="flex-1 bg-white dark:bg-black">
      <SafeAreaView edges={["top"]} className="px-6 pb-2">
        <Text className="text-[32px] font-semibold leading-[44px] text-black dark:text-white">
          Lessons
        </Text>
      </SafeAreaView>
    </View>
  );
}
