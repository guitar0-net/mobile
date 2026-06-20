// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { type Tuning } from "@/features/tuner/tunings";
import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

type Props = {
  tuning: Tuning;
  // null = auto mode; a number = manually selected string index (0 = string 6)
  selectedIndex: number | null;
  // the string currently detected (used to highlight in auto mode)
  detectedIndex: number | null;
  onSelect: (index: number | null) => void;
};

export function StringSelector({
  tuning,
  selectedIndex,
  detectedIndex,
  onSelect,
}: Props) {
  const colors = useColors();

  return (
    <View className="flex-row gap-2">
      {tuning.strings.map((s, i) => {
        const isSelected = selectedIndex === i;
        // In auto mode highlight the detected string dimly; in manual mode highlight selection fully
        const isDetected = selectedIndex === null && detectedIndex === i;
        const isActive = isSelected || isDetected;
        const stringNumber = 6 - i;

        function handlePress() {
          // Tapping the already-selected string returns to auto mode
          onSelect(selectedIndex === i ? null : i);
        }

        return (
          <Pressable
            key={i}
            onPress={handlePress}
            className="flex-1 items-center rounded-xl py-3 active:opacity-70"
            style={{
              backgroundColor: isActive
                ? isSelected
                  ? colors.primary
                  : withAlpha(colors.primary, 0.25)
                : colors.surface,
            }}
          >
            <Text
              className="font-sans-semibold text-base"
              style={{ color: isSelected ? colors.primaryFg : colors.foreground }}
            >
              {s.note}
            </Text>
            <Text
              className="text-xs"
              style={{
                color: isSelected ? withAlpha(colors.primaryFg, 0.7) : colors.mutedFg,
              }}
            >
              {stringNumber}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
