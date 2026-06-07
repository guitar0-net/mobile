// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, type PressableProps, View } from "react-native";

import { resolveIconColor, useTheme } from "@/lib/themes";
import { cn } from "@/lib/utils";

import { Text } from "./text";

export type ButtonVariant = "default" | "outline" | "ghost" | "inverse" | "link";
export type ButtonSize = "sm" | "default" | "lg" | "icon" | "icon-sm";

type ButtonProps = Omit<PressableProps, "style"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Symbol icon rendered to the left of children (or centered for size="icon").
   * Use `{ ios: "play.fill", android: "play_arrow" }` for cross-platform icons.
   */
  icon?: SymbolViewProps["name"];
  className?: string;
  /**
   * Label text. Ignored when `size="icon"` — use only the `icon` prop in that case.
   */
  children?: React.ReactNode;
};

const VARIANT_WRAPPER: Record<ButtonVariant, string> = {
  default: "bg-primary",
  outline: "bg-transparent border border-border",
  ghost: "bg-transparent",
  inverse: "bg-primary-fg",
  link: "bg-transparent",
};

const VARIANT_TEXT: Record<ButtonVariant, string> = {
  default: "text-primary-fg",
  outline: "text-foreground",
  ghost: "text-foreground",
  inverse: "text-primary",
  link: "text-primary",
};

const SIZE_WRAPPER: Record<ButtonSize, string> = {
  sm: "h-9 rounded-full px-4",
  default: "h-11 rounded-full px-5",
  lg: "h-14 rounded-full px-6",
  icon: "h-11 w-11 rounded-full",
  "icon-sm": "h-9 w-9 rounded-full",
};

const SIZE_INNER_GAP: Record<ButtonSize, string> = {
  sm: "gap-1.5",
  default: "gap-2",
  lg: "gap-2",
  icon: "",
  "icon-sm": "",
};

const SIZE_TEXT: Record<ButtonSize, string> = {
  sm: "text-sm",
  default: "text-base",
  lg: "text-lg",
  icon: "text-base",
  "icon-sm": "text-base",
};

const ICON_SIZE: Record<ButtonSize, number> = {
  sm: 14,
  default: 18,
  lg: 20,
  icon: 22,
  "icon-sm": 18,
};

const VARIANT_ICON_COLOR: Record<ButtonVariant, "white" | "foreground" | "primary"> = {
  default: "white",
  outline: "foreground",
  ghost: "foreground",
  inverse: "primary",
  link: "primary",
};

export function Button({
  variant = "default",
  size = "default",
  icon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isIconOnly = size === "icon" || size === "icon-sm";
  const { theme } = useTheme();
  const iconColor = resolveIconColor(VARIANT_ICON_COLOR[variant], theme);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        "flex-row items-center justify-center",
        VARIANT_WRAPPER[variant],
        variant !== "link" && SIZE_WRAPPER[size],
        disabled && "opacity-50",
        className,
      )}
      {...props}
    >
      {({ pressed }) => (
        <View
          className={cn(
            "flex-row items-center justify-center",
            !isIconOnly && SIZE_INNER_GAP[size],
            pressed && "opacity-70",
          )}
        >
          {icon && (
            <SymbolView name={icon} size={ICON_SIZE[size]} tintColor={iconColor} />
          )}
          {!isIconOnly && children && (
            <Text
              variant="body"
              className={cn(
                "font-sans-semibold",
                SIZE_TEXT[size],
                VARIANT_TEXT[variant],
              )}
            >
              {children}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
