// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

import type { LessonLinkRow } from "../queries";

type Props = {
  lesson: LessonLinkRow;
};

export function LessonLinkCard({ lesson }: Props) {
  const router = useRouter();
  const colors = useColors();

  return (
    <Pressable
      onPress={() =>
        router.push(
          `/lesson/${lesson.lessonUuid}?courseId=${lesson.courseUuid}&order=${lesson.order}&total=${lesson.totalInCourse}`,
        )
      }
      className="flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <SymbolView
        name={{ ios: "bookmark.fill", android: "bookmark" }}
        size={20}
        tintColor={colors.primary}
      />
      <View className="flex-1 gap-0.5">
        <Text
          variant="caption"
          className="text-xs uppercase tracking-wider text-muted-fg"
        >
          {lesson.courseTitle}
        </Text>
        <Text variant="body" className="font-sans-semibold">
          {lesson.title}
        </Text>
      </View>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right" }}
        size={18}
        tintColor={colors.mutedFg}
      />
    </Pressable>
  );
}
