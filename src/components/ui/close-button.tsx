// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, type PressableProps } from "react-native";

import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

type Props = Pick<PressableProps, "onPress"> & { className?: string };

export function CloseButton({ onPress, className }: Props) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Закрыть"
      className={cn(
        "h-8 w-8 items-center justify-center rounded-full bg-background active:opacity-70",
        className,
      )}
    >
      <SymbolView
        name={{ ios: "xmark", android: "close" }}
        size={14}
        tintColor={colors.mutedFg}
      />
    </Pressable>
  );
}
