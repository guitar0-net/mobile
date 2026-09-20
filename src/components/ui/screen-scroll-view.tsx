// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { forwardRef } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = ScrollViewProps & {
  bottomSafeArea?: boolean;
};

export const ScreenScrollView = forwardRef<ScrollView, Props>(function ScreenScrollView(
  { bottomSafeArea = true, ...props },
  ref,
) {
  const scrollView = (
    <ScrollView
      ref={ref}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      {...props}
    />
  );

  if (!bottomSafeArea) return scrollView;

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1">
      {scrollView}
    </SafeAreaView>
  );
});
