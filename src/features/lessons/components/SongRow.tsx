// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

type Props = {
  title: string;
  completed: boolean;
  metronome: number;
  onPress: () => void;
};

export function SongRow({ title, completed, metronome, onPress }: Props) {
  const colors = useColors();

  const iconName = completed
    ? { ios: "checkmark.circle.fill" as const, android: "check_circle" as const }
    : { ios: "circle" as const, android: "radio_button_unchecked" as const };
  const tintColor = completed ? colors.success : colors.mutedFg;

  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-xl border border-border bg-surface p-4"
      onPress={onPress}
    >
      <SymbolView name={iconName} size={24} tintColor={tintColor} />
      <View className="flex-1">
        <Text variant="body" className="font-sans-semibold">
          {title}
        </Text>
      </View>
      {metronome > 0 && <Badge variant="outline">{metronome} BPM</Badge>}
    </Pressable>
  );
}
