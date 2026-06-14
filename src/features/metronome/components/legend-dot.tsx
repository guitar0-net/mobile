// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Text } from "@/components/ui/text";

type Props = {
  color: string;
  border?: string;
  label: string;
};

export function LegendDot({ color, border, label }: Props) {
  return (
    <View className="flex-row items-center gap-[5px]">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          borderWidth: border ? 1 : 0,
          borderColor: border,
        }}
      />
      <Text className="text-xs text-muted-fg">{label}</Text>
    </View>
  );
}
