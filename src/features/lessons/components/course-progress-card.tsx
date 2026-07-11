// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Text } from "@/components/ui/text";

type Props = {
  courseTitle: string;
  completed: number;
  total: number;
  pct: number;
};

export function CourseProgressCard({ courseTitle, completed, total, pct }: Props) {
  return (
    <View className="gap-2 rounded-xl border border-border bg-surface p-4">
      <Text variant="heading">{courseTitle}</Text>
      <View className="flex-row items-center justify-between">
        <Text variant="caption">
          {completed} из {total} уроков
        </Text>
        <Text variant="caption">{pct}%</Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full border border-border">
        <View className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
