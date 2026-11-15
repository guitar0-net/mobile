// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { cssInterop } from "nativewind";
import type { ComponentProps } from "react";

import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

cssInterop(BottomSheetTextInput, { className: "style" });

type Props = ComponentProps<typeof BottomSheetTextInput> & { className?: string };

/** Text field for use inside a `Sheet`: it keeps the sheet above the keyboard. */
export function TextInput({ className, multiline, ...props }: Props) {
  const colors = useColors();

  return (
    <BottomSheetTextInput
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
