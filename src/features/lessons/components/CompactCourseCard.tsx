// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { describeRemainingItems } from "@/lib/utils";

import type { LessonInfo } from "./CourseContinueCard";

type Props = {
  lesson: LessonInfo;
  courseTitle: string;
  onPress?: () => void;
};

export function CompactCourseCard({ lesson, courseTitle, onPress }: Props) {
  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-4">
      <View className="gap-1">
        <Text variant="caption">
          {courseTitle} · Урок {lesson.order}
        </Text>
        <Text variant="heading">{lesson.title}</Text>
        {(lesson.remainingSongs > 0 || lesson.videoRemaining) && (
          <Text variant="caption">
            {describeRemainingItems(lesson.remainingSongs, lesson.videoRemaining)}
          </Text>
        )}
      </View>
      <Button
        variant="outline"
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
