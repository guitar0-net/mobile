// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { ThemeProvider } from "@/lib/themes";
import type { ThemeName } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";
import type { ThemeMode } from "@/lib/themes/resolve-theme";

import { Toggle } from "./toggle";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  resetSettingsForTesting();
});

describe("Toggle", () => {
  test("renders a Switch with the given value", () => {
    render(<Toggle value={true} onValueChange={jest.fn()} />, { wrapper });
    expect(screen.UNSAFE_getByType(Switch).props.value).toBe(true);
  });

  test("calls onValueChange when the switch is toggled", () => {
    const onValueChange = jest.fn();
    render(<Toggle value={false} onValueChange={onValueChange} />, { wrapper });
    fireEvent(screen.UNSAFE_getByType(Switch), "valueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  test.each<[ThemeName, ThemeMode, boolean]>([
    ["light", "light", false],
    ["dark", "dark", false],
    ["contrast-light", "light", true],
    ["contrast-dark", "dark", true],
  ])("stays visible in %s", (theme, themeMode, highContrast) => {
    useSettingsStore.setState({ themeMode, highContrast });
    const background = THEME_DEFINITIONS[theme]["--color-background"];

    const { rerender } = render(<Toggle value={false} onValueChange={jest.fn()} />, {
      wrapper,
    });
    const off = screen.UNSAFE_getByType(Switch).props;
    expect(off.trackColor.false).not.toBe(background);
    expect(off.ios_backgroundColor).not.toBe(background);
    expect(off.thumbColor).not.toBe(off.trackColor.false);

    rerender(<Toggle value={true} onValueChange={jest.fn()} />);
    const on = screen.UNSAFE_getByType(Switch).props;
    expect(on.trackColor.true).not.toBe(background);
    expect(on.thumbColor).not.toBe(on.trackColor.true);
  });

  test.each<[ThemeName, ThemeMode]>([
    ["contrast-light", "light"],
    ["contrast-dark", "dark"],
  ])("keeps the thumb distinct from the background in %s", (theme, themeMode) => {
    useSettingsStore.setState({ themeMode, highContrast: true });
    render(<Toggle value={false} onValueChange={jest.fn()} />, { wrapper });
    expect(screen.UNSAFE_getByType(Switch).props.thumbColor).not.toBe(
      THEME_DEFINITIONS[theme]["--color-background"],
    );
  });
});
