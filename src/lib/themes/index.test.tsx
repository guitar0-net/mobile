// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import * as ReactNative from "react-native";

import { resolveIconColor, ThemeProvider, useTheme, type ThemeName } from "./index";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("useTheme", () => {
  test("returns a theme name and setTheme function", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(["light", "dark", "contrast-light", "contrast-dark"]).toContain(
      result.current.theme,
    );
    expect(typeof result.current.setTheme).toBe("function");
  });

  test("switches theme when setTheme is called", () => {
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
  test("respects defaultTheme prop", () => {
    function customWrapper({ children }: { children: ReactNode }) {
      return <ThemeProvider defaultTheme="contrast-dark">{children}</ThemeProvider>;
    }

    const { result } = renderHook(() => useTheme(), { wrapper: customWrapper });
    expect(result.current.theme).toBe<ThemeName>("contrast-dark");
  });

  test("falls back to dark theme when system color scheme is dark and no defaultTheme", () => {
    const spy = jest.spyOn(ReactNative, "useColorScheme").mockReturnValue("dark");

    function darkSystemWrapper({ children }: { children: ReactNode }) {
      return <ThemeProvider>{children}</ThemeProvider>;
    }

    const { result } = renderHook(() => useTheme(), { wrapper: darkSystemWrapper });
    expect(result.current.theme).toBe<ThemeName>("dark");

    spy.mockRestore();
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
