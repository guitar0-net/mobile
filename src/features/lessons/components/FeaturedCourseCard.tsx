// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { describeRemainingItems } from "@/lib/utils";

import type { LessonInfo } from "./CourseContinueCard";

type Props = {
  lesson: LessonInfo;
  courseTitle: string;
  onPress?: () => void;
};

export function FeaturedCourseCard({ lesson, courseTitle, onPress }: Props) {
  const { primaryFg } = useColors();

  return (
    <View className="gap-3 rounded-2xl bg-primary p-4">
      <View className="gap-1">
        <Text
          className="font-sans text-xs uppercase tracking-wider"
          style={{ color: primaryFg }}
        >
          {courseTitle} · Урок {lesson.order}
        </Text>
        <Text className="font-sans-semibold text-2xl" style={{ color: primaryFg }}>
          {lesson.title}
        </Text>
        {(lesson.remainingSongs > 0 || lesson.videoRemaining) && (
          <Text
            className="font-sans text-sm"
            style={{ color: primaryFg, opacity: 0.8 }}
          >
            {describeRemainingItems(lesson.remainingSongs, lesson.videoRemaining)}
          </Text>
        )}
      </View>

      <View className="bg-primary-fg/20 h-1.5 overflow-hidden rounded-full">
        <View
          className="bg-primary-fg/80 h-full rounded-full"
          style={{ width: `${lesson.progressPct}%` }}
        />
      </View>

      <Button
        variant="inverse"
        size="sm"
        icon={{ ios: "play.fill", android: "play_arrow" }}
        className="self-start"
        onPress={onPress}
      >
        {lesson.hasProgress ? "Продолжить" : "Начать"}
      </Button>
    </View>
  );
}
