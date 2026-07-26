// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { ThemeProvider } from "@/lib/themes";
import type { ThemeName } from "@/lib/themes";
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

  test.each<ThemeName>(["contrast-light", "contrast-dark"])(
    "keeps on/off states visually distinct in %s",
    (theme) => {
      useSettingsStore.setState({
        themeMode: theme === "contrast-dark" ? "dark" : "light",
        highContrast: true,
      });

      const { rerender } = render(<Toggle value={false} onValueChange={jest.fn()} />, {
        wrapper,
      });
      const offProps = screen.UNSAFE_getByType(Switch).props;

      rerender(<Toggle value={true} onValueChange={jest.fn()} />);
      const onProps = screen.UNSAFE_getByType(Switch).props;

      // Track color must change between on/off, or the switch shows the
      // same fill no matter its state.
      expect(offProps.trackColor.false).not.toBe(offProps.trackColor.true);
      // The thumb must contrast against its own track in both states, or it
      // disappears entirely (e.g. white thumb on white track).
      expect(offProps.thumbColor).not.toBe(offProps.trackColor.false);
      expect(onProps.thumbColor).not.toBe(onProps.trackColor.true);
    },
  );

  test.each<ThemeMode>(["light", "dark"])(
    "leaves the native thumb color (with its drop shadow) alone in %s",
    (theme) => {
      useSettingsStore.setState({
        themeMode: theme,
        highContrast: false,
      });

      const { rerender } = render(<Toggle value={false} onValueChange={jest.fn()} />, {
        wrapper,
      });
      // Track colors are never white outside the contrast themes, so a
      // forced thumbColor would only strip the native drop shadow for no
      // reason — leaving it unset keeps the standard platform look.
      expect(screen.UNSAFE_getByType(Switch).props.thumbColor).toBeUndefined();

      rerender(<Toggle value={true} onValueChange={jest.fn()} />);
      expect(screen.UNSAFE_getByType(Switch).props.thumbColor).toBeUndefined();
    },
  );

  test("defers applying new colors by a frame so a same-tick native redraw can't clobber them", () => {
    jest.useFakeTimers();
    try {
      useSettingsStore.setState({ themeMode: "light", highContrast: true });
      const { rerender } = render(<Toggle value={true} onValueChange={jest.fn()} />, {
        wrapper,
      });
      const before = screen.UNSAFE_getByType(Switch).props.trackColor;

      useSettingsStore.setState({ themeMode: "dark" });
      rerender(<Toggle value={true} onValueChange={jest.fn()} />);

      // Right after the theme change, the switch must still show the
      // previous colors. iOS 26 resets UISwitch's thumbTintColor to white on
      // the next redraw after it's set (facebook/react-native#53856), and
      // ThemeProvider's Appearance.setColorScheme() triggers exactly that
      // kind of redraw on every theme change. Applying colors in the same
      // tick would mean the redraw wins and wipes them.
      expect(screen.UNSAFE_getByType(Switch).props.trackColor).toEqual(before);

      act(() => {
        jest.runOnlyPendingTimers();
      });

      // One frame later, the deferred colors land.
      expect(screen.UNSAFE_getByType(Switch).props.trackColor).not.toEqual(before);
    } finally {
      jest.useRealTimers();
    }
  });
});
