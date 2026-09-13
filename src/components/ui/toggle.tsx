// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Switch } from "react-native";

import { useColors } from "@/lib/themes";

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
};

export function Toggle({ value, onValueChange }: Props) {
  const colors = useColors();
  // iOS 26 may reset thumbColor to white (facebook/react-native#53856)
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.mutedFg, true: colors.primary }}
      ios_backgroundColor={colors.mutedFg}
      thumbColor={colors.switchThumb}
    />
  );
}
