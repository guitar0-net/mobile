// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as SystemUI from "expo-system-ui";
import { vars } from "nativewind";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactElement,
  type ReactNode,
} from "react";
import { Appearance, useColorScheme, View } from "react-native";

import { useThemePreference } from "@/features/settings";

import { THEME_DEFINITIONS, type ThemeName } from "./definitions";
import { resolveTheme } from "./resolve-theme";

export type { ThemeName };

/**
 * Resolves an icon color token to a real hex string for use with SymbolView's
 * tintColor prop (which cannot accept CSS variables or Tailwind classes).
 *
 * Use "primaryFg" for icons on solid colored backgrounds (primary, destructive,
 * brand-*) — those tokens all collapse to the same black/white pair as primary
 * in the contrast themes, so primary-fg is guaranteed to stay readable against
 * them. A hardcoded "#FFFFFF" would go invisible in contrast-dark, where
 * primary (and brand-*) become white.
 * Use "foreground" for icons on transparent or neutral backgrounds,
 * and "primary" for icons on primary-fg (inverse) backgrounds.
 */
export function resolveIconColor(
  color: "primaryFg" | "foreground" | "primary",
  theme: ThemeName,
): string {
  if (color === "primaryFg") return THEME_DEFINITIONS[theme]["--color-primary-fg"];
  if (color === "primary") return THEME_DEFINITIONS[theme]["--color-primary"];
  return THEME_DEFINITIONS[theme]["--color-foreground"];
}

type ThemeContextValue = {
  theme: ThemeName;
  colors: Colors;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  colors: colorsFromTheme("light"),
});

export function useTheme() {
  return useContext(ThemeContext);
}

export type Colors = {
  primary: string;
  primaryFg: string;
  background: string;
  surface: string;
  foreground: string;
  mutedFg: string;
  border: string;
  success: string;
  warning: string;
  destructive: string;
  brandRed: string;
  brandAmber: string;
  brandBrown: string;
};

function colorsFromTheme(theme: ThemeName): Colors {
  const t = THEME_DEFINITIONS[theme];
  return {
    primary: t["--color-primary"],
    primaryFg: t["--color-primary-fg"],
    background: t["--color-background"],
    surface: t["--color-surface"],
    foreground: t["--color-foreground"],
    mutedFg: t["--color-muted-fg"],
    border: t["--color-border"],
    success: t["--color-success"],
    warning: t["--color-warning"],
    destructive: t["--color-destructive"],
    brandRed: t["--color-brand-red"],
    brandAmber: t["--color-brand-amber"],
    brandBrown: t["--color-brand-brown"],
  };
}

export function useColors(): Colors {
  return useContext(ThemeContext).colors;
}

export function useThemedScreenOptions() {
  const { colors } = useContext(ThemeContext);
  return useMemo(
    () => ({
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.foreground,
      headerTitleStyle: { color: colors.foreground },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors],
  );
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const { themeMode, highContrast } = useThemePreference();
  const systemScheme = useColorScheme();

  const theme = useMemo<ThemeName>(
    () => resolveTheme(themeMode, highContrast, systemScheme),
    [themeMode, highContrast, systemScheme],
  );
  const colors = useMemo(() => colorsFromTheme(theme), [theme]);
  const ctx = useMemo(() => ({ theme, colors }), [theme, colors]);
  const viewStyle = useMemo(
    () => [
      { flex: 1, backgroundColor: colors.background },
      vars(THEME_DEFINITIONS[theme]),
    ],
    [theme, colors],
  );

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  useEffect(() => {
    const isDark = theme === "dark" || theme === "contrast-dark";
    Appearance.setColorScheme(isDark ? "dark" : "light");
  }, [theme]);

  return (
    <ThemeContext.Provider value={ctx}>
      <View style={viewStyle}>{children}</View>
    </ThemeContext.Provider>
  );
}
