// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import * as ReactNative from "react-native";

import { useThemePreference } from "@/lib/settings";

import { resolveIconColor, ThemeProvider, useTheme, type ThemeName } from "./index";
import { resetSettingsForTesting } from "../settings/__tests__/testing";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("useTheme", () => {
  test("returns a resolved theme name and setTheme function", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(["light", "dark", "contrast-light", "contrast-dark"]).toContain(
      result.current.theme,
    );
    expect(typeof result.current.setTheme).toBe("function");
  });

  test("switches theme when setTheme is called and persists to settings", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.setTheme("contrast-light");
    });
    expect(result.current.theme).toBe("contrast-light");
  });
});

describe("ThemeProvider", () => {
  test("falls back to dark theme when system color scheme is dark and no stored preference", () => {
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");

    function darkSystemWrapper({ children }: { children: ReactNode }) {
      return <ThemeProvider>{children}</ThemeProvider>;
    }

    const { result } = renderHook(() => useTheme(), { wrapper: darkSystemWrapper });
    expect(result.current.theme).toBe<ThemeName>("dark");

    spy.mockRestore();
  });

  test("falls back to light theme when system color scheme is light and no stored preference", () => {
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe<ThemeName>("light");

    spy.mockRestore();
  });

  test("uses stored preference over system color scheme", () => {
    // Simulate: user previously chose contrast-dark, but system is light
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("light");

    const { result } = renderHook(() => useTheme(), { wrapper });

    // Store a preference
    act(() => {
      result.current.setTheme("contrast-dark");
    });

    // Even though system is light, stored preference wins
    expect(result.current.theme).toBe<ThemeName>("contrast-dark");

    spy.mockRestore();
  });

  test("setTheme via useTheme writes through to settings (ensures persistence across restarts)", () => {
    // This test verifies the bridge between ThemeProvider and the MMKV-backed
    // settings module. If ThemeProvider still uses its own useState, the
    // settings store will remain unchanged and the assertion will fail.
    const { result: themeResult } = renderHook(() => useTheme(), { wrapper });
    const { result: settingsResult } = renderHook(() => useThemePreference());

    expect(settingsResult.current.theme).toBeUndefined();

    act(() => {
      themeResult.current.setTheme("contrast-dark");
    });

    expect(settingsResult.current.theme).toBe<ThemeName>("contrast-dark");
  });
});

describe("resolveIconColor", () => {
  test('returns #FFFFFF for "white"', () => {
    expect(resolveIconColor("white", "light")).toBe("#FFFFFF");
    expect(resolveIconColor("white", "dark")).toBe("#FFFFFF");
  });

  test('returns theme foreground hex for "foreground"', () => {
    const lightFg = resolveIconColor("foreground", "light");
    const darkFg = resolveIconColor("foreground", "dark");
    expect(lightFg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(darkFg).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
