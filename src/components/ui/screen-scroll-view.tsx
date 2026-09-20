// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { forwardRef } from "react";
import { ScrollView, View, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = ScrollViewProps & {
  bottomSafeArea?: boolean;
};

export const ScreenScrollView = forwardRef<ScrollView, Props>(function ScreenScrollView(
  { bottomSafeArea = true, children, ...props },
  ref,
) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      {...props}
    >
      {children}
      {bottomSafeArea && <View style={{ height: insets.bottom }} />}
    </ScrollView>
  );
});
