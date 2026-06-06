// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";

import { Button } from "./button";

describe("Button", () => {
  test("renders children as text", () => {
    render(<Button>Начать урок</Button>);
    expect(screen.getByText("Начать урок")).toBeTruthy();
  });

  test("renders with icon", () => {
    render(<Button icon={{ ios: "play.fill", android: "play_arrow" }}>Видео</Button>);
    expect(screen.getByText("Видео")).toBeTruthy();
  });

  test("is not pressable when disabled", () => {
    render(<Button disabled>Скачать</Button>);
    const button = screen.getByRole("button");
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  test("does not render label text when size is icon even if children are passed", () => {
    render(
      <Button size="icon" icon={{ ios: "gear", android: "settings" }}>
        Hidden
      </Button>,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  test("renders accessible button when only icon is provided without children", () => {
    render(<Button icon={{ ios: "play.fill", android: "play_arrow" }} />);
    expect(screen.getByRole("button")).toBeTruthy();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(<Button onPress={onPress}>Начать урок</Button>);
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    render(
      <Button disabled onPress={onPress}>
        Скачать
      </Button>,
    );
    fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
