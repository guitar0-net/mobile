// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { InlineNameForm } from "./inline-name-form";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseProps = {
  title: "Сохранить размер",
  name: "",
  pattern: ["strong", "normal", "normal"] as const,
  onChangeName: jest.fn(),
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("InlineNameForm", () => {
  test("renders the title", () => {
    const { getByText } = render(<InlineNameForm {...baseProps} />, { wrapper });
    expect(getByText("Сохранить размер")).toBeTruthy();
  });

  test("shows character count for current name length", () => {
    const { getByText } = render(<InlineNameForm {...baseProps} name="Вальс" />, {
      wrapper,
    });
    expect(getByText("5/24")).toBeTruthy();
  });

  test("shows 0/24 when name is empty", () => {
    const { getByText } = render(<InlineNameForm {...baseProps} name="" />, {
      wrapper,
    });
    expect(getByText("0/24")).toBeTruthy();
  });

  test("Confirm button is disabled when name is empty", () => {
    const { getAllByRole } = render(<InlineNameForm {...baseProps} name="" />, {
      wrapper,
    });
    const buttons = getAllByRole("button");
    const confirmButton = buttons[buttons.length - 1];
    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
  });

  test("calls onCancel when cancel button is pressed", () => {
    const onCancel = jest.fn();
    const { getByText } = render(
      <InlineNameForm {...baseProps} onCancel={onCancel} />,
      { wrapper },
    );
    fireEvent.press(getByText("Отмена"));
    expect(onCancel).toHaveBeenCalled();
  });

  test("calls onConfirm when confirm button is pressed with a non-empty name", () => {
    const onConfirm = jest.fn();
    const { getByText } = render(
      <InlineNameForm {...baseProps} name="Вальс" onConfirm={onConfirm} />,
      { wrapper },
    );
    fireEvent.press(getByText("Сохранить"));
    expect(onConfirm).toHaveBeenCalled();
  });

  test("calls onChangeName truncated to 24 chars when input changes", () => {
    const onChangeName = jest.fn();
    const { getByPlaceholderText } = render(
      <InlineNameForm {...baseProps} onChangeName={onChangeName} />,
      { wrapper },
    );
    const longName = "А".repeat(30);
    fireEvent.changeText(getByPlaceholderText("Например: Вальс"), longName);
    expect(onChangeName).toHaveBeenCalledWith("А".repeat(24));
  });

  test("shows beat count from pattern", () => {
    const { getByText } = render(
      <InlineNameForm {...baseProps} pattern={["strong", "normal", "muted"]} />,
      { wrapper },
    );
    expect(getByText("3 долей")).toBeTruthy();
  });
});
