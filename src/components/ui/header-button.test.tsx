// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";

import { HeaderButton } from "./header-button";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("HeaderButton", () => {
  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <HeaderButton
        icon={{ ios: "gear", android: "settings" }}
        onPress={onPress}
        testID="header-btn"
      />,
      { wrapper },
    );
    fireEvent.press(getByTestId("header-btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("tints the icon with the foreground color when inactive", () => {
    const { UNSAFE_getByType } = render(
      <HeaderButton icon={{ ios: "gear", android: "settings" }} onPress={jest.fn()} />,
      { wrapper },
    );
    expect(UNSAFE_getByType(SymbolView).props.tintColor).toBe(
      THEME_DEFINITIONS.light["--color-foreground"],
    );
  });

  test("tints the icon with the primary color when active", () => {
    const { UNSAFE_getByType } = render(
      <HeaderButton
        icon={{ ios: "gear", android: "settings" }}
        onPress={jest.fn()}
        active
      />,
      { wrapper },
    );
    expect(UNSAFE_getByType(SymbolView).props.tintColor).toBe(
      THEME_DEFINITIONS.light["--color-primary"],
    );
  });
});
