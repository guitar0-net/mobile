// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetScrollView,
  type BottomSheetScrollViewMethods,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { forwardRef, useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/lib/themes";

type SheetScrollViewProps = React.ComponentProps<typeof BottomSheetScrollView>;

export const SheetScrollView = forwardRef<
  BottomSheetScrollViewMethods,
  SheetScrollViewProps
>(function SheetScrollView({ children, ...props }, ref) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetScrollView ref={ref} {...props}>
      {children}
      <View style={{ height: insets.bottom }} />
    </BottomSheetScrollView>
  );
});

type Props = {
  visible: boolean;
  onClose: () => void;
  /**
   * - `auto` — dynamic height, wraps content in `BottomSheetView`. No scroll.
   * - `large` — fixed 88% height. For scrollable content use `SheetScrollView`:
   *   place a header `<View>` and `<SheetScrollView>` as direct siblings, NO `flex:1` on either.
   *   `flex:1` breaks layout: Yoga doesn't see heights set by Reanimated's `useAnimatedStyle`.
   */
  size?: "auto" | "large";
  children: React.ReactNode;
};

export function Sheet({ visible, onClose, size = "auto", children }: Props) {
  const ref = useRef<BottomSheet>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    [],
  );

  const isLarge = size === "large";

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={isLarge ? ["88%"] : undefined}
      enableDynamicSizing={!isLarge}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      enablePanDownToClose
      onClose={onClose}
    >
      {isLarge ? (
        children
      ) : (
        <BottomSheetView style={{ paddingBottom: insets.bottom }}>
          {children}
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}
