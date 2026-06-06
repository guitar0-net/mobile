// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  done: boolean;
  isContinue: boolean;
};

export function SongChip({ title, done, isContinue }: Props) {
  const colors = useColors();

  const borderStyle = !isContinue && done ? { borderColor: colors.success } : undefined;
  const tintColor = isContinue ? colors.primaryFg : colors.success;
  const textColor = !isContinue
    ? { color: done ? colors.success : colors.mutedFg }
    : undefined;

  return (
    <View
      className={cn(
        "flex-row items-center gap-0.5 rounded border px-1.5 py-0.5",
        isContinue ? "border-primary-fg" : "border-border",
      )}
      style={borderStyle}
    >
      {done && (
        <SymbolView
          name={{ ios: "checkmark", android: "check" }}
          size={9}
          tintColor={tintColor}
        />
      )}
      <Text
        variant="caption"
        className={cn(
          "text-xs",
          isContinue && "text-primary-fg",
          isContinue && !done && "opacity-70",
        )}
        style={textColor}
      >
        {title}
      </Text>
    </View>
  );
}
