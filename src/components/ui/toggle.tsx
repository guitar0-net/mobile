// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect, useState } from "react";
import { Switch } from "react-native";

import { useColors } from "@/lib/themes";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function Toggle({ value, onValueChange }: Props) {
  const colors = useColors();
  // iOS 26 has a UIKit bug where UISwitch silently resets thumbTintColor to
  // white on the next system-level redraw after it's set
  // (facebook/react-native#53856, confirmed as an Apple bug, not RN's).
  // ThemeProvider's Appearance.setColorScheme() call triggers exactly that
  // kind of redraw on every theme change, so pushing the new colors in the
  // same frame gets wiped out a moment later. Deferring by one frame lets
  // that redraw finish before we apply the colors.
  const [appliedColors, setAppliedColors] = useState(colors);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAppliedColors(colors));
    return () => cancelAnimationFrame(id);
  }, [colors]);

  const trackColor = value ? appliedColors.primary : appliedColors.surface;
  // A custom thumbColor loses the native drop shadow, so only override it
  // when the track itself is white (the high-contrast themes) — otherwise a
  // white thumb disappears into a white track. Everywhere else, leaving
  // thumbColor unset keeps the native white-with-shadow look.
  const thumbColor =
    trackColor === "#FFFFFF"
      ? value
        ? appliedColors.primaryFg
        : appliedColors.foreground
      : undefined;

  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: appliedColors.surface, true: appliedColors.primary }}
      thumbColor={thumbColor}
      ios_backgroundColor={appliedColors.surface}
    />
  );
}
