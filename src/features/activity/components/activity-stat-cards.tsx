// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { formatHoursMinutesRu, pluralFormRu } from "@/lib/utils";

type ActivityStatCardsProps = {
  streakDays: number;
  lessonsCompleted: number;
  totalSeconds: number;
};

type StatCardProps = {
  icon: SymbolViewProps["name"];
  iconColor: string;
  value: string;
  label: string;
};

function StatCard({ icon, iconColor, value, label }: StatCardProps) {
  return (
    <View className="flex-1 items-start gap-1 rounded-xl border border-border p-3">
      <SymbolView name={icon} size={20} tintColor={iconColor} />
      <Text variant="heading" className="text-2xl">
        {value}
      </Text>
      <Text variant="caption" className="text-center">
        {label}
      </Text>
    </View>
  );
}

export function ActivityStatCards({
  streakDays,
  lessonsCompleted,
  totalSeconds,
}: ActivityStatCardsProps) {
  const colors = useColors();

  return (
    <View className="mt-4 flex-row gap-3">
      <StatCard
        icon={{ ios: "flame.fill", android: "local_fire_department" }}
        iconColor={colors.brandRed}
        value={String(streakDays)}
        label={`${pluralFormRu(streakDays, "день", "дня", "дней")} подряд`}
      />
      <StatCard
        icon={{ ios: "book.closed.fill", android: "menu_book" }}
        iconColor={colors.brandAmber}
        value={String(lessonsCompleted)}
        label={pluralFormRu(lessonsCompleted, "урок", "урока", "уроков")}
      />
      <StatCard
        icon={{ ios: "stopwatch.fill", android: "timer" }}
        iconColor={colors.brandBrown}
        value={formatHoursMinutesRu(totalSeconds)}
        label="играли всего"
      />
    </View>
  );
}
