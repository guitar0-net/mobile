// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-center">
      <Text variant="heading" className="flex-1">
        {title}
      </Text>
      {children && <View className="flex-row items-center">{children}</View>}
    </View>
  );
}

type ControlButtonProps = {
  icon: SymbolViewProps["name"];
  onPress: () => void;
  disabled?: boolean;
};

export function ControlButton({ icon, onPress, disabled }: ControlButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      className={cn("h-9 w-9 items-center justify-center", disabled && "opacity-30")}
    >
      {({ pressed }) => (
        <SymbolView
          name={icon}
          size={18}
          tintColor={pressed ? colors.mutedFg : colors.foreground}
        />
      )}
    </Pressable>
  );
}
