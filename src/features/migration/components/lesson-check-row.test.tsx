// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { LessonCheckRow } from "./lesson-check-row";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("LessonCheckRow", () => {
  test("renders the lesson position next to its title", () => {
    render(
      <LessonCheckRow
        order={7}
        title="Бой шестёрка"
        completed={false}
        onToggle={jest.fn()}
      />,
      { wrapper },
    );

    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByText("Бой шестёрка")).toBeTruthy();
  });

  test("exposes completion as a checkbox state", () => {
    render(
      <LessonCheckRow order={1} title="Знакомство" completed onToggle={jest.fn()} />,
      { wrapper },
    );

    expect(screen.getByRole("checkbox", { name: "Знакомство" })).toBeTruthy();
    expect(
      screen.getByRole("checkbox", { checked: true, name: "Знакомство" }),
    ).toBeTruthy();
  });

  test("toggles when pressed", () => {
    const onToggle = jest.fn();
    render(
      <LessonCheckRow
        order={1}
        title="Знакомство"
        completed={false}
        onToggle={onToggle}
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByText("Знакомство"));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
