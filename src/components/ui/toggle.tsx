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
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.primary }}
      ios_backgroundColor={colors.border}
    />
  );
}
