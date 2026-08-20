// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

type Props = {
  order: number;
  title: string;
  completed: boolean;
  onToggle: () => void;
};

export function LessonCheckRow({ order, title, completed, onToggle }: Props) {
  const colors = useColors();

  const iconName = completed
    ? { ios: "checkmark.circle.fill" as const, android: "check_circle" as const }
    : { ios: "circle" as const, android: "radio_button_unchecked" as const };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={title}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3"
      onPress={onToggle}
    >
      <SymbolView
        name={iconName}
        size={24}
        tintColor={completed ? colors.success : colors.mutedFg}
      />
      <Text variant="caption" className="w-6 text-muted-fg">
        {order}
      </Text>
      <View className="flex-1">
        <Text variant="body">{title}</Text>
      </View>
    </Pressable>
  );
}
