// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";
import { cn, pluralSongs } from "@/lib/utils";

import type { LessonState } from "../logic";
import type { CourseLessonRow } from "../queries";

type Props = {
  lesson: CourseLessonRow;
  state: LessonState;
  onPress: () => void;
};

export function LessonListItem({ lesson, state, onPress }: Props) {
  const { theme } = useTheme();
  const colors = THEME_DEFINITIONS[theme];

  const isContinue = state === "continue";
  const isCompleted = state === "completed";
  const isInProgress = state === "in-progress";

  const statusLabel = isCompleted
    ? "Пройден"
    : isContinue
      ? "Продолжить"
      : isInProgress
        ? "В процессе"
        : null;

  const durationText =
    lesson.duration != null ? `${Math.round(lesson.duration / 60)} мин` : null;

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-3 rounded-xl p-4",
        isContinue ? "bg-primary" : "border border-border bg-surface",
      )}
    >
      {isCompleted && (
        <SymbolView
          name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
          size={32}
          tintColor={colors["--color-success"]}
        />
      )}

      {isContinue && (
        <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-fg">
          <Text className="font-sans-semibold text-sm text-primary">
            {lesson.order}
          </Text>
        </View>
      )}

      {isInProgress && (
        <SymbolView
          name={{ ios: "circle.righthalf.filled", android: "timelapse" }}
          size={32}
          tintColor={colors["--color-primary"]}
        />
      )}

      {state === "neutral" && (
        <View className="h-8 w-8 items-center justify-center rounded-full border border-muted-fg">
          <Text variant="caption" className="text-sm">
            {lesson.order}
          </Text>
        </View>
      )}

      <View className="flex-1 gap-0.5">
        {statusLabel && (
          <Text
            variant="caption"
            className={cn(
              "text-xs uppercase tracking-wider",
              isContinue && "text-primary-fg opacity-80",
            )}
          >
            {statusLabel}
          </Text>
        )}
        <Text
          variant="body"
          className={cn("font-sans-semibold", isContinue && "text-primary-fg")}
        >
          {lesson.title}
        </Text>
        <View className="flex-row gap-2">
          {durationText && (
            <Text
              variant="caption"
              className={isContinue ? "text-primary-fg opacity-70" : ""}
            >
              {durationText}
            </Text>
          )}
          <Text
            variant="caption"
            className={isContinue ? "text-primary-fg opacity-70" : ""}
          >
            {pluralSongs(lesson.songCount)}
          </Text>
        </View>
      </View>

      {isContinue && (
        <SymbolView
          name={{ ios: "play.fill", android: "play_arrow" }}
          size={20}
          tintColor={colors["--color-primary-fg"]}
        />
      )}
    </Pressable>
  );
}
