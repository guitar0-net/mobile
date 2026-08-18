// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import LottieView, { type LottieViewProps } from "lottie-react-native";

type LottieAnimationProps = {
  source: LottieViewProps["source"] | number;
  loop?: boolean;
  autoPlay?: boolean;
  size?: number;
};

export function LottieAnimation({
  source,
  loop = true,
  autoPlay = true,
  size,
}: LottieAnimationProps) {
  return (
    <LottieView
      // lottie-react-native's types omit the `number` returned by
      // require(".lottie"/".json") even though the native side resolves it
      // like any other packager asset (mirrors RN's own Image source typing).
      source={source as LottieViewProps["source"]}
      loop={loop}
      autoPlay={autoPlay}
      style={size !== undefined ? { width: size, height: size } : undefined}
    />
  );
}
