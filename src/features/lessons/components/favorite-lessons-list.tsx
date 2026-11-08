// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { SymbolViewProps } from "expo-symbols";
import { FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";

import { useFavoriteLessons } from "../queries";
import { LessonLinkCard } from "./lesson-link-card";

const BOOKMARK_ICON: SymbolViewProps["name"] = {
  ios: "bookmark.fill",
  android: "bookmark",
};

export function FavoriteLessonsList() {
  const { lessons, isLoading } = useFavoriteLessons();

  if (!isLoading && lessons.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-fg">
          У вас пока нет избранных уроков
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1">
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="gap-2 p-4"
        contentInsetAdjustmentBehavior="automatic"
        data={lessons}
        keyExtractor={(item) => item.lessonUuid}
        renderItem={({ item }) => <LessonLinkCard lesson={item} icon={BOOKMARK_ICON} />}
      />
    </SafeAreaView>
  );
}
