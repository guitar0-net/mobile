// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { vars } from "nativewind";
import {
  createContext,
  useContext,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useColorScheme, View } from "react-native";

import { THEME_DEFINITIONS, type ThemeName } from "./definitions";

export type { ThemeName };

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
  defaultTheme?: ThemeName;
};

export function ThemeProvider({
  children,
  defaultTheme,
}: ThemeProviderProps): ReactElement {
  const systemScheme = useColorScheme();

  const [theme, setTheme] = useState<ThemeName>(
    defaultTheme ?? (systemScheme === "dark" ? "dark" : "light"),
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <View style={[{ flex: 1 }, vars(THEME_DEFINITIONS[theme])]}>{children}</View>
    </ThemeContext.Provider>
  );
}
