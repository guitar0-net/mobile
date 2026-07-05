// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, type PressableProps } from "react-native";

import { useColors } from "@/lib/themes";

type HeaderButtonProps = Omit<PressableProps, "style"> & {
  icon: SymbolViewProps["name"];
  size?: number;
  tintColor?: string;
  active?: boolean;
};

export function HeaderButton({
  icon,
  size = 22,
  tintColor,
  active = false,
  onPress,
  ...rest
}: HeaderButtonProps) {
  const colors = useColors();
  const resolvedTint = tintColor ?? (active ? colors.primary : colors.foreground);
  return (
    <Pressable hitSlop={8} onPress={onPress} {...rest}>
      <SymbolView name={icon} size={size} tintColor={resolvedTint} />
    </Pressable>
  );
}
