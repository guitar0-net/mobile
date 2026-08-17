// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { DonationSupportCard } from "./donation-support-card";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  mockPush.mockClear();
});

describe("DonationSupportCard", () => {
  test("shows the support label", () => {
    render(<DonationSupportCard />, { wrapper });
    expect(screen.getByText("Поддержать проект")).toBeTruthy();
  });

  test("navigates to the donate screen when pressed", () => {
    render(<DonationSupportCard />, { wrapper });
    fireEvent.press(screen.getByText("Поддержать проект"));

    expect(mockPush).toHaveBeenCalledWith("/donate");
  });
});
