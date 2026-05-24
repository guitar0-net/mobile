// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { vars } from "nativewind";
import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import { useColorScheme, View } from "react-native";

import { useThemePreference } from "@/lib/settings";

import { THEME_DEFINITIONS, type ThemeName } from "./definitions";

export type { ThemeName };

/**
 * Resolves an icon color token to a real hex string for use with SymbolView's
 * tintColor prop (which cannot accept CSS variables or Tailwind classes).
 *
 * Use "white" for icons on solid colored backgrounds (e.g. primary, destructive),
 * and "foreground" for icons on transparent or neutral backgrounds.
 */
export function resolveIconColor(
  color: "white" | "foreground",
  theme: ThemeName,
): string {
  return color === "white" ? "#FFFFFF" : THEME_DEFINITIONS[theme]["--color-foreground"];
}

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps): ReactElement {
  const { theme: storedTheme, setTheme } = useThemePreference();
  const systemScheme = useColorScheme();

  const theme: ThemeName = storedTheme ?? (systemScheme === "dark" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <View style={[{ flex: 1 }, vars(THEME_DEFINITIONS[theme])]}>{children}</View>
    </ThemeContext.Provider>
  );
}
