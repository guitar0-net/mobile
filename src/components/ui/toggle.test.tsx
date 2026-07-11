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
      useSettingsStore.setState({ theme });

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
});
