// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent } from "expo-precision-metronome";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

const PAD_SIZE = 44;
const PAD_GAP = 8;
const PAD_LABEL_GAP = 6;

const NEXT_ACCENT: Record<BeatAccent, BeatAccent> = {
  strong: "normal",
  normal: "muted",
  muted: "strong",
};

type Props = {
  pattern: BeatAccent[];
  currentBeat: number;
  onPatternChange: (pattern: BeatAccent[]) => void;
};

export function BeatIndicator({ pattern, currentBeat, onPatternChange }: Props) {
  const handleCycle = (index: number) => {
    const newPattern = [...pattern];
    newPattern[index] = NEXT_ACCENT[newPattern[index]];
    onPatternChange(newPattern);
  };

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: PAD_GAP }}>
      {pattern.map((accent, index) => (
        <BeatPad
          key={index}
          accent={accent}
          beatNumber={index + 1}
          isCurrentBeat={currentBeat === index}
          onPress={() => handleCycle(index)}
        />
      ))}
    </View>
  );
}

type BeatPadProps = {
  accent: BeatAccent;
  beatNumber: number;
  isCurrentBeat: boolean;
  onPress: () => void;
};

function BeatPad({ accent, beatNumber, isCurrentBeat, onPress }: BeatPadProps) {
  const colors = useColors();
  const beat = useSharedValue(0);

  useEffect(() => {
    if (isCurrentBeat) {
      beat.value = withSequence(
        withTiming(1, { duration: 30 }),
        withTiming(0, { duration: 130 }),
      );
    }
  }, [isCurrentBeat, beat]);

  let padColor: string;
  if (accent === "strong") padColor = colors.primary;
  else if (accent === "normal") padColor = withAlpha(colors.primary, 0.45);
  else padColor = withAlpha(colors.mutedFg, 0.15);

  const padStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + beat.value * 0.1 }],
  }));

  const numberStyle = useAnimatedStyle(() => ({
    color: interpolateColor(beat.value, [0, 1], [colors.mutedFg, colors.foreground]),
  }));

  return (
    <View style={{ width: PAD_SIZE, alignItems: "center", gap: PAD_LABEL_GAP }}>
      <Pressable onPress={onPress} style={{ width: PAD_SIZE, height: PAD_SIZE }}>
        {({ pressed }) => (
          <Animated.View
            style={[
              {
                width: PAD_SIZE,
                height: PAD_SIZE,
                borderRadius: 12,
                backgroundColor: padColor,
                borderWidth: accent === "muted" ? 1.5 : 0,
                borderColor: withAlpha(colors.mutedFg, 0.5),
                opacity: pressed ? 0.7 : 1,
              },
              padStyle,
            ]}
          />
        )}
      </Pressable>
      <Animated.Text style={[{ fontSize: 11, lineHeight: 14 }, numberStyle]}>
        {beatNumber}
      </Animated.Text>
    </View>
  );
}
