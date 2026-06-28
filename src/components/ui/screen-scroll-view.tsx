// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { forwardRef } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";

export const ScreenScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function ScreenScrollView(props, ref) {
    return (
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        {...props}
      />
    );
  },
);
