// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import { ThemeProvider } from "@/lib/themes";

import { Toggle } from "./toggle";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

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
});
