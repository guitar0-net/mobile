// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ThemeName } from "./definitions";

export type ThemeMode = "light" | "dark" | "system";
export type SystemScheme = "light" | "dark" | "unspecified" | null | undefined;

export function resolveTheme(
  themeMode: ThemeMode,
  highContrast: boolean,
  systemScheme: SystemScheme,
): ThemeName {
  const base =
    themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  if (!highContrast) return base;
  return base === "dark" ? "contrast-dark" : "contrast-light";
}
