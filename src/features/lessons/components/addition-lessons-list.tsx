// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useProgress } from "@/features/settings";
import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

import { isLessonCompleted } from "../logic";
import type { AdditionLessonRow } from "../queries";

type Props = {
  lessons: AdditionLessonRow[];
};

export function AdditionLessonsList({ lessons }: Props) {
  const router = useRouter();
  const colors = useColors();
  const { progress } = useProgress();

  if (lessons.length === 0) return null;

  return (
    <View className="mt-6">
      <Text variant="caption" className="text-xs uppercase tracking-wider">
        Дополнительные уроки
      </Text>
      <View className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
        {lessons.map((lesson, index) => {
          const completed = isLessonCompleted(lesson, progress[lesson.lessonUuid]);
          return (
            <Pressable
              key={lesson.lessonUuid}
              accessibilityRole="button"
              accessibilityLabel={completed ? `${lesson.title}, пройден` : lesson.title}
              onPress={() =>
                router.push(
                  `/lesson/${lesson.lessonUuid}?courseId=${lesson.courseUuid}&order=${lesson.order}&total=${lesson.totalInCourse}`,
                )
              }
              className={cn(
                "flex-row items-center gap-3 px-4 py-3",
                index > 0 && "border-t border-border",
              )}
            >
              {completed ? (
                <SymbolView
                  name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
                  size={18}
                  tintColor={colors.success}
                />
              ) : (
                <SymbolView
                  name={{
                    ios: "arrow.turn.down.right",
                    android: "subdirectory_arrow_right",
                  }}
                  size={18}
                  tintColor={colors.mutedFg}
                />
              )}
              <Text variant="body" className="flex-1">
                {lesson.title}
              </Text>
              <SymbolView
                name={{ ios: "chevron.right", android: "chevron_right" }}
                size={16}
                tintColor={colors.mutedFg}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
