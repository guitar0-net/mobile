// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, SymbolViewProps } from "expo-symbols";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors, type Colors } from "@/lib/themes";

type SymbolName = SymbolViewProps["name"];

type Variant = "success" | "warning" | "error";

type StatusMessageProps = {
  variant: Variant;
  icon?: SymbolName;
  inline?: boolean;
  children: React.ReactNode;
};

const DEFAULT_ICONS: Record<Variant, SymbolName> = {
  success: { ios: "checkmark.circle.fill", android: "check_circle" },
  warning: { ios: "exclamationmark.circle.fill", android: "warning" },
  error: { ios: "exclamationmark.triangle.fill", android: "error" },
};

const COLOR_KEY: Record<Variant, keyof Colors> = {
  success: "success",
  warning: "warning",
  error: "destructive",
};

export function StatusMessage({
  variant,
  icon,
  inline = false,
  children,
}: StatusMessageProps) {
  const colors = useColors();
  const color = colors[COLOR_KEY[variant]];
  const symbol = (
    <SymbolView
      name={icon ?? DEFAULT_ICONS[variant]}
      size={inline ? 20 : 32}
      tintColor={color}
    />
  );

  if (inline) {
    return (
      <View className="flex-row items-center gap-2">
        {symbol}
        <Text className="flex-1 text-sm text-muted-fg">{children}</Text>
      </View>
    );
  }

  return (
    <>
      {symbol}
      <Text className="text-center text-sm text-muted-fg">{children}</Text>
    </>
  );
}
