// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { resolveTheme } from "./resolve-theme";

describe("resolveTheme", () => {
  test('mode "light" with highContrast off resolves to "light"', () => {
    expect(resolveTheme("light", false, "light")).toBe("light");
  });

  test('mode "dark" with highContrast off resolves to "dark"', () => {
    expect(resolveTheme("dark", false, "light")).toBe("dark");
  });

  test('mode "light" with highContrast on resolves to "contrast-light"', () => {
    expect(resolveTheme("light", true, "light")).toBe("contrast-light");
  });

  test('mode "dark" with highContrast on resolves to "contrast-dark"', () => {
    expect(resolveTheme("dark", true, "light")).toBe("contrast-dark");
  });

  test('mode "system" ignores the explicit mode and follows the OS scheme instead', () => {
    expect(resolveTheme("system", false, "dark")).toBe("dark");
    expect(resolveTheme("system", false, "light")).toBe("light");
  });

  test('mode "system" combined with highContrast picks the contrast variant matching the OS scheme', () => {
    expect(resolveTheme("system", true, "dark")).toBe("contrast-dark");
    expect(resolveTheme("system", true, "light")).toBe("contrast-light");
  });

  test('mode "system" with no OS scheme reported (null/undefined/"unspecified") falls back to light', () => {
    expect(resolveTheme("system", false, null)).toBe("light");
    expect(resolveTheme("system", false, undefined)).toBe("light");
    expect(resolveTheme("system", false, "unspecified")).toBe("light");
  });
});
