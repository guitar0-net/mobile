// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

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
});
