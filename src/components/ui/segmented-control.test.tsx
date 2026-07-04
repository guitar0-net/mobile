// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";

import { SegmentedControl } from "./segmented-control";

const STRING_OPTIONS = [
  { label: "Вертикальная", value: "vertical" as const },
  { label: "Горизонтальная", value: "horizontal" as const },
];

const NUMBER_OPTIONS = [
  { label: "1", value: 1 as const },
  { label: "2", value: 2 as const },
  { label: "3", value: 3 as const },
];

describe("SegmentedControl", () => {
  test("renders all option labels", () => {
    render(
      <SegmentedControl
        options={STRING_OPTIONS}
        value="vertical"
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByText("Вертикальная")).toBeTruthy();
    expect(screen.getByText("Горизонтальная")).toBeTruthy();
  });

  test("marks the selected option as selected", () => {
    render(
      <SegmentedControl
        options={STRING_OPTIONS}
        value="horizontal"
        onChange={jest.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[0].props.accessibilityState?.selected).toBe(false);
    expect(buttons[1].props.accessibilityState?.selected).toBe(true);
  });

  test("calls onChange with the pressed option value", () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={STRING_OPTIONS}
        value="vertical"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByText("Горизонтальная"));
    expect(onChange).toHaveBeenCalledWith("horizontal");
  });

  test("calls onChange even when pressing the already-selected option", () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={STRING_OPTIONS}
        value="vertical"
        onChange={onChange}
      />,
    );
    fireEvent.press(screen.getByText("Вертикальная"));
    expect(onChange).toHaveBeenCalledWith("vertical");
  });

  test("works with number values", () => {
    const onChange = jest.fn();
    render(<SegmentedControl options={NUMBER_OPTIONS} value={1} onChange={onChange} />);
    fireEvent.press(screen.getByText("3"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  test("marks correct number option as selected", () => {
    render(
      <SegmentedControl options={NUMBER_OPTIONS} value={2} onChange={jest.fn()} />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons[1].props.accessibilityState?.selected).toBe(true);
  });
});
