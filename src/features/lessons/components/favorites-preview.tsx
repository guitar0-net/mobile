// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { useFavoriteLessons } from "../queries";
import { FavoriteLessonCard } from "./favorite-lesson-card";

const PREVIEW_LIMIT = 3;

export function FavoritesPreview() {
  const router = useRouter();
  const { lessons } = useFavoriteLessons(PREVIEW_LIMIT);

  if (lessons.length === 0) return null;

  return (
    <View className="mt-6 gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading" className="text-xl">
          Избранное
        </Text>
        <Button variant="link" onPress={() => router.push("/favorites")}>
          Все
        </Button>
      </View>
      {lessons.map((lesson) => (
        <FavoriteLessonCard key={lesson.lessonUuid} lesson={lesson} />
      ))}
    </View>
  );
}
