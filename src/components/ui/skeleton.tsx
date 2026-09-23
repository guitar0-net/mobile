// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { cn } from "@/lib/utils";

const PULSE_DURATION_MS = 800;

type SkeletonProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ className, style }: SkeletonProps) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.4, {
        duration: PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      className={cn("rounded-md bg-surface", className)}
      style={[style, animatedStyle]}
    />
  );
}
