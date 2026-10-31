// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

import type { DonationTier } from "../catalog";

const POP_SCALE = 1.4;
const POP_MS = 150;
const WIGGLE_DEGREES = 12;
const WIGGLE_STEP_MS = 110;
const WIGGLE_REPEATS = 2;
const WIGGLE_DELAY_MS = 350;

type Props = {
  tier: DonationTier;
};

export function DonationThanksCard({ tier }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(POP_SCALE, { duration: POP_MS }),
      withSpring(1, { damping: 7, stiffness: 160 }),
    );
    rotation.value = withDelay(
      WIGGLE_DELAY_MS,
      withRepeat(
        withSequence(
          withTiming(-WIGGLE_DEGREES, { duration: WIGGLE_STEP_MS }),
          withTiming(WIGGLE_DEGREES, { duration: WIGGLE_STEP_MS * 2 }),
          withTiming(0, { duration: WIGGLE_STEP_MS }),
        ),
        WIGGLE_REPEATS,
      ),
    );
  }, [scale, rotation]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-4 rounded-xl bg-surface p-4"
    >
      <Animated.View style={iconStyle}>
        <SymbolView name={tier.icon} size={36} tintColor={colors.primary} />
      </Animated.View>
      <View className="flex-1 gap-1">
        <Text className="font-sans-semibold">Спасибо за поддержку!</Text>
        <Text variant="caption">{tier.thanks}</Text>
      </View>
    </View>
  );
}
