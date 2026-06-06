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

export type { ThemeName };

/**
 * Resolves an icon color token to a real hex string for use with SymbolView's
 * tintColor prop (which cannot accept CSS variables or Tailwind classes).
 *
 * Use "white" for icons on solid colored backgrounds (e.g. primary, destructive),
 * "foreground" for icons on transparent or neutral backgrounds,
 * and "primary" for icons on primary-fg (inverse) backgrounds.
 */
export function resolveIconColor(
  color: "white" | "foreground" | "primary",
  theme: ThemeName,
): string {
  if (color === "white") return "#FFFFFF";
  if (color === "primary") return THEME_DEFINITIONS[theme]["--color-primary"];
  return THEME_DEFINITIONS[theme]["--color-foreground"];
}

type ThemeContextValue = {
  theme: ThemeName;
  colors: Colors;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  colors: colorsFromTheme("light"),
  setTheme: () => {},
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
  const { theme: storedTheme, setTheme } = useThemePreference();
  const systemScheme = useColorScheme();

  const theme = useMemo<ThemeName>(
    () => storedTheme ?? (systemScheme === "dark" ? "dark" : "light"),
    [storedTheme, systemScheme],
  );
  const colors = useMemo(() => colorsFromTheme(theme), [theme]);
  const ctx = useMemo(() => ({ theme, colors, setTheme }), [theme, colors, setTheme]);
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
