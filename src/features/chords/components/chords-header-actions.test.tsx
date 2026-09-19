// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react-native";
import type { ReactNode } from "react";

import { useDiagramSettings } from "@/features/settings";
import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { ChordsHeaderActions } from "./chords-header-actions";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  resetSettingsForTesting();
});

describe("ChordsHeaderActions", () => {
  test("size - button is disabled at minimum size", () => {
    render(<ChordsHeaderActions />, { wrapper });

    // Default size is 3; press twice to reach minimum (1)
    const getMinusBtn = () => screen.getByTestId("btn-size-minus");
    act(() => fireEvent.press(getMinusBtn())); // 3 → 2
    act(() => fireEvent.press(getMinusBtn())); // 2 → 1

    expect(getMinusBtn()).toBeDisabled();
  });

  test("size + button is disabled at maximum size", () => {
    render(<ChordsHeaderActions />, { wrapper });

    // Default size is 3; press twice to reach maximum (5)
    const getPlusBtn = () => screen.getByTestId("btn-size-plus");
    act(() => fireEvent.press(getPlusBtn())); // 3 → 4
    act(() => fireEvent.press(getPlusBtn())); // 4 → 5

    expect(getPlusBtn()).toBeDisabled();
  });

  test("orientation toggle flips from vertical to horizontal", () => {
    const { result } = renderHook(() => useDiagramSettings(), { wrapper });
    render(<ChordsHeaderActions />, { wrapper });

    expect(result.current.chordOrientation).toBe("vertical");

    act(() => fireEvent.press(screen.getByTestId("btn-orientation")));

    expect(result.current.chordOrientation).toBe("horizontal");
  });
});
