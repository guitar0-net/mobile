// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const SWEEP_WIDTH_PERCENT = 30;
const SWEEP_DURATION_MS = 1200;

type Props = {
  value?: number;
};

export function ProgressBar({ value }: Props) {
  const percent =
    value === undefined ? undefined : Math.round(Math.min(Math.max(value, 0), 1) * 100);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityState={{ busy: percent === undefined }}
      accessibilityValue={
        percent === undefined ? undefined : { min: 0, max: 100, now: percent }
      }
      className="h-1.5 w-full overflow-hidden rounded-full border border-border"
    >
      {percent === undefined ? (
        <IndeterminateSweep />
      ) : (
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      )}
    </View>
  );
}

function IndeterminateSweep() {
  const left = useSharedValue(-SWEEP_WIDTH_PERCENT);

  useEffect(() => {
    left.value = withRepeat(
      withTiming(100, {
        duration: SWEEP_DURATION_MS,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
    );
    return () => cancelAnimation(left);
  }, [left]);

  const animatedStyle = useAnimatedStyle(() => ({ left: `${left.value}%` }));

  return (
    <Animated.View
      className="absolute h-full rounded-full bg-primary"
      style={[{ width: `${SWEEP_WIDTH_PERCENT}%` }, animatedStyle]}
    />
  );
}
