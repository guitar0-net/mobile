// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent } from "expo-precision-metronome";
import { View } from "react-native";

import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

export function PatternDots({ pattern }: { pattern: readonly BeatAccent[] }) {
  const colors = useColors();

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
      {pattern.map((accent, i) => {
        let backgroundColor: string;
        if (accent === "strong") backgroundColor = colors.primary;
        else if (accent === "normal") backgroundColor = withAlpha(colors.primary, 0.45);
        else backgroundColor = withAlpha(colors.mutedFg, 0.15);

        return (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor,
              borderWidth: accent === "muted" ? 1.5 : 0,
              borderColor: withAlpha(colors.mutedFg, 0.5),
            }}
          />
        );
      })}
    </View>
  );
}
