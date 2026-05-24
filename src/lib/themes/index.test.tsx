// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider, useTheme, type ThemeName } from "./index";

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
});
