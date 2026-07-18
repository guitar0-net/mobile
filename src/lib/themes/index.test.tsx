// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import * as ReactNative from "react-native";

import { useThemePreference } from "@/features/settings";
import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";

import {
  resolveIconColor,
  ThemeProvider,
  useTheme,
  useThemedScreenOptions,
  type ThemeName,
} from "./index";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("useTheme", () => {
  test("returns a resolved theme name and its colors", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(["light", "dark", "contrast-light", "contrast-dark"]).toContain(
      result.current.theme,
    );
    expect(result.current.colors.background).toBeDefined();
  });
});

describe("ThemeProvider", () => {
  test('falls back to dark theme when system color scheme is dark and themeMode is "system" (default)', () => {
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe<ThemeName>("dark");

    spy.mockRestore();
  });

  test('falls back to light theme when system color scheme is light and themeMode is "system" (default)', () => {
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe<ThemeName>("light");

    spy.mockRestore();
  });

  test("stored themeMode overrides the system color scheme", () => {
    // Simulate: user previously chose "dark", but system is light
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { result: prefResult } = renderHook(() => useThemePreference());
    act(() => {
      prefResult.current.setThemeMode("dark");
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe<ThemeName>("dark");

    spy.mockRestore();
  });

  test("highContrast combines with themeMode to select the contrast variant", () => {
    const { result: prefResult } = renderHook(() => useThemePreference());
    act(() => {
      prefResult.current.setThemeMode("dark");
      prefResult.current.setHighContrast(true);
    });

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe<ThemeName>("contrast-dark");
  });

  test("theme recomputes reactively when the settings store changes", () => {
    const { result: prefResult } = renderHook(() => useThemePreference());
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).not.toBe<ThemeName>("contrast-light");

    act(() => {
      prefResult.current.setThemeMode("light");
      prefResult.current.setHighContrast(true);
    });

    expect(result.current.theme).toBe<ThemeName>("contrast-light");
  });
});

describe("useThemedScreenOptions", () => {
  test("returns header options with background and tint colors", () => {
    const { result } = renderHook(() => useThemedScreenOptions(), { wrapper });
    expect(result.current.headerShadowVisible).toBe(false);
    expect(result.current.headerStyle).toBeDefined();
    expect(result.current.headerTintColor).toBeDefined();
    expect(result.current.contentStyle).toBeDefined();
  });

  test("options update when theme changes", () => {
    const { result: prefResult } = renderHook(() => useThemePreference());
    const { result } = renderHook(() => useThemedScreenOptions(), { wrapper });

    const lightBg = (result.current.contentStyle as { backgroundColor: string })
      .backgroundColor;

    act(() => {
      prefResult.current.setThemeMode("dark");
    });

    const darkBg = (result.current.contentStyle as { backgroundColor: string })
      .backgroundColor;
    expect(darkBg).not.toBe(lightBg);
  });
});

describe("resolveIconColor", () => {
  test('returns #FFFFFF for "primaryFg" in light and dark', () => {
    expect(resolveIconColor("primaryFg", "light")).toBe("#FFFFFF");
    expect(resolveIconColor("primaryFg", "dark")).toBe("#FFFFFF");
  });

  test('"primaryFg" flips to stay readable against primary in contrast themes', () => {
    // contrast-dark's --color-primary flips to white, so an icon drawn on a
    // primary-colored background must flip to black too, or it disappears.
    expect(resolveIconColor("primaryFg", "contrast-light")).toBe("#FFFFFF");
    expect(resolveIconColor("primaryFg", "contrast-dark")).toBe("#000000");
  });

  test('returns theme foreground hex for "foreground"', () => {
    const lightFg = resolveIconColor("foreground", "light");
    const darkFg = resolveIconColor("foreground", "dark");
    expect(lightFg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(darkFg).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
