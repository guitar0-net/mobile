// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { TextInput as RNTextInput, type TextInputProps } from "react-native";

import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

type Props = TextInputProps & { className?: string };

export function TextInput({ className, multiline, ...props }: Props) {
  const colors = useColors();

  return (
    <RNTextInput
      placeholderTextColor={colors.mutedFg}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      className={cn(
        "rounded-xl bg-surface px-3 py-2.5 font-sans text-[15px] text-foreground",
        multiline && "min-h-24",
        className,
      )}
      {...props}
    />
  );
}
