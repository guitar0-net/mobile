// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, within } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { useChordIndex, useChordsByTitle } from "../queries";
import { ChordsScreen } from "./chords-screen";

jest.mock("../queries", () => ({
  useChordIndex: jest.fn(),
  useChordsByTitle: jest.fn(),
}));

jest.mock("react-native-svg", () => ({ SvgXml: () => null }));

const mockUseChordIndex = useChordIndex as jest.Mock;
const mockUseChordsByTitle = useChordsByTitle as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const INDEX = [
  { note: "C", variants: ["", "m", "7", "m7", "#", "#m"] },
  { note: "E", variants: ["", "m", "7", "m7"] },
];

function requestedTitle() {
  return mockUseChordsByTitle.mock.lastCall![0] as string;
}

function variantBar() {
  return within(screen.getByTestId("chord-variants"));
}

beforeEach(() => {
  resetSettingsForTesting();
  mockUseChordIndex.mockReturnValue({ data: INDEX });
  mockUseChordsByTitle.mockReturnValue({ data: [] });
});

describe("ChordsScreen", () => {
  test("starts on the first note in major", () => {
    render(<ChordsScreen />, { wrapper });

    expect(requestedTitle()).toBe("C");
    expect(screen.getByTestId("chord-title")).toHaveTextContent("C");
  });

  test("the major chip is labelled with the note and selects the plain chord", () => {
    render(<ChordsScreen />, { wrapper });
    fireEvent.press(variantBar().getByText("m7"));
    expect(requestedTitle()).toBe("Cm7");

    fireEvent.press(variantBar().getByText("C"));

    expect(requestedTitle()).toBe("C");
  });

  test("selecting a variant asks for that chord", () => {
    render(<ChordsScreen />, { wrapper });

    fireEvent.press(variantBar().getByText("#m"));

    expect(requestedTitle()).toBe("C#m");
  });

  test("switching the note narrows the variant toolbar to that note", () => {
    render(<ChordsScreen />, { wrapper });
    expect(variantBar().getByText("#m")).toBeTruthy();

    fireEvent.press(screen.getByText("E"));

    expect(variantBar().queryByText("#m")).toBeNull();
    expect(variantBar().getByText("E")).toBeTruthy();
  });

  test("keeps the chosen variant when switching to a note that has it", () => {
    render(<ChordsScreen />, { wrapper });

    fireEvent.press(variantBar().getByText("m7"));
    fireEvent.press(screen.getByText("E"));

    expect(requestedTitle()).toBe("Em7");
  });

  test("falls back to major when the chosen variant is missing on the new note", () => {
    render(<ChordsScreen />, { wrapper });

    fireEvent.press(variantBar().getByText("#m"));
    fireEvent.press(screen.getByText("E"));

    expect(requestedTitle()).toBe("E");
  });

  test("shows the russian name of the selected chord next to its title", () => {
    mockUseChordsByTitle.mockReturnValue({
      data: [{ id: 1, title: "C", musicalTitle: "до мажор" }],
    });

    render(<ChordsScreen />, { wrapper });

    expect(screen.getByTestId("chord-title")).toHaveTextContent("C · до мажор");
  });

  test("explains the empty screen before the first sync", () => {
    mockUseChordIndex.mockReturnValue({ data: [] });

    render(<ChordsScreen />, { wrapper });

    expect(screen.getByText(/Аккорды ещё не загружены/)).toBeTruthy();
  });
});
