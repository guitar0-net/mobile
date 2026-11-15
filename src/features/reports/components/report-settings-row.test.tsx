// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { ReportSettingsRow } from "./report-settings-row";

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isInternetReachable: true }),
}));
jest.mock("expo-router", () => ({ useSegments: () => ["settings"] }));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

test("the settings row opens the app report form with an email field", () => {
  render(<ReportSettingsRow />, { wrapper });
  expect(screen.queryByText("Ошибка или идея?")).toBeNull();

  fireEvent.press(screen.getByText("Сообщить об ошибке или идее"));

  expect(screen.getByText("Ошибка или идея?")).toBeTruthy();
  expect(screen.getByText("Предложить функцию")).toBeTruthy();
  expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
});
