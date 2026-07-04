// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Pressable, View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "./text";

type Option<T extends string | number> = {
  label: string;
  value: T;
};

type Props<T extends string | number> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View className="flex-row overflow-hidden rounded-lg border border-border">
      {options.map((option, index) => {
        const isSelected = option.value === value;
        const isLast = index === options.length - 1;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option.value)}
            className={cn(
              "flex-1 items-center justify-center py-2",
              isSelected ? "bg-primary" : "bg-transparent",
              !isLast && "border-r border-border",
            )}
          >
            <Text
              className={cn(
                "font-sans-semibold text-sm",
                isSelected ? "text-primary-fg" : "text-foreground",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
