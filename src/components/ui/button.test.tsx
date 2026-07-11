// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { ThemeProvider } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";

import { Button } from "./button";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  resetSettingsForTesting();
});

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

  test("default variant icon stays readable against its own background in contrast-dark", () => {
    // Regression test: contrast-dark flips --color-primary to white. The
    // default variant's background is bg-primary, so a hardcoded white icon
    // tint would disappear on it — the icon must track --color-primary-fg instead.
    useSettingsStore.setState({ theme: "contrast-dark" });
    render(
      <Button icon={{ ios: "play.fill", android: "play_arrow" }}>YouTube</Button>,
      { wrapper },
    );
    expect(screen.UNSAFE_getByType(SymbolView).props.tintColor).toBe(
      THEME_DEFINITIONS["contrast-dark"]["--color-primary-fg"],
    );
  });
});
