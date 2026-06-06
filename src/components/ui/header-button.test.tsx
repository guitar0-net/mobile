// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

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
});
