// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Ref } from "react";
import { TextInput as RNTextInput, View, type TextInputProps } from "react-native";

import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

import { Text } from "./text";

type Props = TextInputProps & {
  className?: string;
  /** Outlines the field in red and shows the message under it. */
  error?: string;
  ref?: Ref<RNTextInput>;
};

export function TextInput({ className, multiline, error, ref, ...props }: Props) {
  const colors = useColors();

  return (
    <View className="gap-1.5">
      <RNTextInput
        ref={ref}
        placeholderTextColor={colors.mutedFg}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={cn(
          "rounded-xl border bg-surface px-3 py-2.5 font-sans text-[15px] text-foreground",
          error ? "border-destructive" : "border-transparent",
          multiline && "min-h-24",
          className,
        )}
        {...props}
      />
      {error && <FieldError>{error}</FieldError>}
    </View>
  );
}

export function FieldError({ children }: { children: string }) {
  return (
    <Text variant="caption" className="text-destructive" accessibilityRole="alert">
      {children}
    </Text>
  );
}
