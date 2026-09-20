// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { ChipBar } from "./chip-bar";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const OPTIONS = [
  { label: "C", value: "" },
  { label: "m", value: "m" },
  { label: "m7", value: "m7" },
];

describe("ChipBar", () => {
  test("renders a chip per option", () => {
    render(<ChipBar options={OPTIONS} value="" onChange={jest.fn()} />, { wrapper });

    expect(screen.getByText("C")).toBeTruthy();
    expect(screen.getByText("m")).toBeTruthy();
    expect(screen.getByText("m7")).toBeTruthy();
  });

  test("pressing a chip reports its value, not its label", () => {
    const onChange = jest.fn();
    render(<ChipBar options={OPTIONS} value="m" onChange={onChange} />, { wrapper });

    fireEvent.press(screen.getByText("C"));

    expect(onChange).toHaveBeenCalledWith("");
  });

  test("marks only the chip matching value as selected", () => {
    render(<ChipBar options={OPTIONS} value="m7" onChange={jest.fn()} />, { wrapper });

    const chips = screen.getAllByRole("button");
    const selected = chips.filter(
      (chip) => chip.props.accessibilityState?.selected === true,
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent("m7");
  });
});
