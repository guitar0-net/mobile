// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Linking, Platform } from "react-native";

import { ThemeProvider } from "@/lib/themes";

import { SupportGroup } from "./support-group";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  mockPush.mockClear();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

describe("SupportGroup", () => {
  test("navigates to the donate screen when the row is pressed", () => {
    render(<SupportGroup />, { wrapper });

    fireEvent.press(screen.getByText("Поддержать проект"));

    expect(mockPush).toHaveBeenCalledWith("/donate");
  });

  test("hides the store rating row on iOS", () => {
    render(<SupportGroup />, { wrapper });

    expect(screen.queryByText("Оценить приложение")).toBeNull();
  });
});

describe("SupportGroup on Android", () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, "OS", "android");
  });

  test("opens the Play Store listing when the rating row is pressed", () => {
    render(<SupportGroup />, { wrapper });

    fireEvent.press(screen.getByText("Оценить приложение"));

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://play.google.com/store/apps/details?id=com.andreykotlyar.guitar0",
    );
  });
});
