// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import type { ReactNode } from "react";
import { View } from "react-native";

import { resolveIconColor, useTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";

import { Text } from "./text";

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

type BadgeProps = {
  variant?: BadgeVariant;
  /**
   * Symbol icon rendered to the left of the label.
   * Use `{ ios: "clock", android: "schedule" }` for cross-platform icons.
   */
  icon?: SymbolViewProps["name"];
  className?: string;
  children: ReactNode;
};

const VARIANT_WRAPPER: Record<BadgeVariant, string> = {
  default: "bg-primary",
  secondary: "bg-surface",
  destructive: "bg-brand-red",
  outline: "bg-transparent border border-border",
};

const VARIANT_TEXT: Record<BadgeVariant, string> = {
  default: "text-primary-fg",
  secondary: "text-foreground",
  destructive: "text-white",
  outline: "text-foreground",
};

// default/destructive have solid colored backgrounds → white icon; secondary/outline are neutral → theme foreground.
const VARIANT_ICON_COLOR: Record<BadgeVariant, "white" | "foreground"> = {
  default: "white",
  secondary: "foreground",
  destructive: "white",
  outline: "foreground",
};

export function Badge({
  variant = "secondary",
  icon,
  className,
  children,
}: BadgeProps) {
  const { theme } = useTheme();
  const iconColor = resolveIconColor(VARIANT_ICON_COLOR[variant], theme);

  return (
    <View
      className={cn(
        "flex-row items-center gap-1 self-start rounded-full px-3 py-1",
        VARIANT_WRAPPER[variant],
        className,
      )}
    >
      {icon && <SymbolView name={icon} size={14} tintColor={iconColor} />}
      <Text
        variant="caption"
        className={cn("font-sans-semibold", VARIANT_TEXT[variant])}
      >
        {children}
      </Text>
    </View>
  );
}
