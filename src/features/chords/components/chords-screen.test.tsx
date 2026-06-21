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

import { useAllChords } from "../queries";
import { ChordsScreen } from "./chords-screen";

jest.mock("../queries", () => ({
  useAllChords: jest.fn(),
}));

const mockUseAllChords = useAllChords as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const mockChord = {
  id: 1,
  title: "Am",
  musicalTitle: "A minor",
  svgHorizontal: null,
  svgVertical: null,
  startFret: null,
  hasBarre: false,
  orderInNote: null,
};

beforeEach(() => {
  resetSettingsForTesting();
  mockUseAllChords.mockReturnValue({ data: [] });
});

describe("ChordsScreen", () => {
  test("renders section header for each note from data", () => {
    mockUseAllChords.mockReturnValue({
      data: [
        { note: "A", chords: [mockChord] },
        { note: "E", chords: [{ ...mockChord, id: 2, title: "Em" }] },
      ],
    });

    render(<ChordsScreen />, { wrapper });

    expect(screen.getAllByText("A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("E").length).toBeGreaterThan(0);
  });

  test("size - button is disabled at minimum size", () => {
    render(<ChordsScreen />, { wrapper });

    // Default size is 3; press twice to reach minimum (1)
    const getMinusBtn = () => screen.getByTestId("btn-size-minus");
    act(() => fireEvent.press(getMinusBtn())); // 3 → 2
    act(() => fireEvent.press(getMinusBtn())); // 2 → 1

    expect(getMinusBtn()).toBeDisabled();
  });

  test("size + button is disabled at maximum size", () => {
    render(<ChordsScreen />, { wrapper });

    // Default size is 3; press twice to reach maximum (5)
    const getPlusBtn = () => screen.getByTestId("btn-size-plus");
    act(() => fireEvent.press(getPlusBtn())); // 3 → 4
    act(() => fireEvent.press(getPlusBtn())); // 4 → 5

    expect(getPlusBtn()).toBeDisabled();
  });

  test("orientation toggle flips from vertical to horizontal", () => {
    const { result } = renderHook(() => useDiagramSettings(), { wrapper });
    render(<ChordsScreen />, { wrapper });

    expect(result.current.chordOrientation).toBe("vertical");

    act(() => fireEvent.press(screen.getByTestId("btn-orientation")));

    expect(result.current.chordOrientation).toBe("horizontal");
  });
});
