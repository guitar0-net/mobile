// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, SymbolViewProps } from "expo-symbols";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/lib/themes";
import { THEME_DEFINITIONS, ThemeTokens } from "@/lib/themes/definitions";

type SymbolName = SymbolViewProps["name"];

type Variant = "success" | "warning" | "error";

type StatusMessageProps = {
  variant: Variant;
  icon?: SymbolName;
  children: React.ReactNode;
};

const DEFAULT_ICONS: Record<Variant, SymbolName> = {
  success: { ios: "checkmark.circle.fill", android: "check_circle" },
  warning: { ios: "exclamationmark.circle.fill", android: "warning" },
  error: { ios: "exclamationmark.triangle.fill", android: "error" },
};

const COLOR_TOKEN: Record<Variant, keyof ThemeTokens> = {
  success: "--color-success",
  warning: "--color-warning",
  error: "--color-destructive",
};

export function StatusMessage({ variant, icon, children }: StatusMessageProps) {
  const { theme } = useTheme();
  const color = THEME_DEFINITIONS[theme][COLOR_TOKEN[variant]];

  return (
    <>
      <SymbolView name={icon ?? DEFAULT_ICONS[variant]} size={32} tintColor={color} />
      <Text className="text-center text-sm text-muted-fg">{children}</Text>
    </>
  );
}
