// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Image } from "react-native";

type AppIconProps = {
  size?: number;
};

export function AppIcon({ size = 100 }: AppIconProps) {
  return (
    <Image
      source={require("@/assets/images/icon.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}
