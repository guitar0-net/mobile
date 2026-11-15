// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Pressable, ScrollView, View } from "react-native";

import { cn } from "@/lib/utils";

import { Text } from "./text";

type Option<T extends string | number> = {
  label: string;
  value: T;
};

type Props<T extends string | number> = {
  options: Option<T>[];
  /** `null` leaves every chip unselected. */
  value: T | null;
  onChange: (value: T) => void;
  /** Wraps chips onto new lines instead of scrolling them horizontally. */
  wrap?: boolean;
  testID?: string;
};

export function ChipBar<T extends string | number>({
  options,
  value,
  onChange,
  wrap = false,
  testID,
}: Props<T>) {
  const chips = options.map((option) => {
    const isSelected = option.value === value;
    return (
      <Pressable
        key={String(option.value)}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        onPress={() => onChange(option.value)}
        className={cn(
          "rounded-full border border-border px-3 py-1.5",
          isSelected && "border-primary bg-primary",
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
  });

  if (wrap) {
    return (
      <View testID={testID} className="flex-row flex-wrap gap-2">
        {chips}
      </View>
    );
  }

  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8 }}
    >
      {chips}
    </ScrollView>
  );
}
