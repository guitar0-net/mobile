// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ScrollView, type ScrollViewProps } from "react-native";

export function ScreenScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      {...props}
    />
  );
}
