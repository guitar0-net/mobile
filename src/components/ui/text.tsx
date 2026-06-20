// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Text as RNText, type TextProps } from "react-native";

import { cn } from "@/lib/utils";

type TextVariant = "body" | "heading" | "caption" | "logo";

type Props = TextProps & {
  /**
   * - `body`    — Geist Regular, base size, foreground color (default)
   * - `heading` — Geist SemiBold, xl size, foreground color
   * - `caption` — Geist Regular, sm size, muted color
   * - `logo`    — Debby, 2xl size
   */
  variant?: TextVariant;
  className?: string;
};

const VARIANT_CLASSES: Record<TextVariant, string> = {
  body: "font-sans text-base text-foreground",
  heading: "font-sans-semibold text-xl text-foreground",
  caption: "font-sans text-sm text-muted-fg",
  logo: "font-logo text-2xl text-primary leading-snug",
};

export function Text({ variant = "body", className, ...props }: Props) {
  return <RNText className={cn(VARIANT_CLASSES[variant], className)} {...props} />;
}
