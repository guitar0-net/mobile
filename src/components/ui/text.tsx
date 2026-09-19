// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Text as RNText, type TextProps } from "react-native";

import { cn } from "@/lib/utils";

type TextVariant = "body" | "screenTitle" | "heading" | "caption" | "logo";

type Props = TextProps & {
  /**
   * - `body`        — Geist Regular, base size, foreground color (default)
   * - `screenTitle` — Geist SemiBold, 4xl size, one per screen at the top
   * - `heading`     — Geist SemiBold, xl size, section headings within a screen
   * - `caption`     — Geist Regular, sm size, muted color
   * - `logo`        — Debby, 4xl size
   */
  variant?: TextVariant;
  className?: string;
};

const VARIANT_CLASSES: Record<TextVariant, string> = {
  body: "font-sans text-base text-foreground",
  screenTitle: "font-sans-semibold text-4xl text-foreground",
  heading: "font-sans-semibold text-xl text-foreground",
  caption: "font-sans text-sm text-muted-fg",
  logo: "font-logo text-4xl leading-snug text-primary",
};

export function Text({ variant = "body", className, ...props }: Props) {
  return <RNText className={cn(VARIANT_CLASSES[variant], className)} {...props} />;
}
