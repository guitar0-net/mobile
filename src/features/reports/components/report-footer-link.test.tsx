// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { ReportFooterLink } from "./report-footer-link";

jest.mock("expo-network", () => ({
  useNetworkState: () => ({ isInternetReachable: true }),
}));
jest.mock("expo-router", () => ({ useSegments: () => ["lesson", "[id]"] }));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const ID = "0b6a2f0e-8f3e-4a4e-9d4b-6c1d2f3a4b5c";

test("the song link opens the song report form", () => {
  render(<ReportFooterLink target={{ type: "song", id: ID }} />, { wrapper });

  expect(screen.getByText("Нашли ошибку в песне?")).toBeTruthy();
  expect(screen.queryByText("Что не так с песней?")).toBeNull();

  fireEvent.press(screen.getByText("Сообщить"));

  expect(screen.getByText("Что не так с песней?")).toBeTruthy();
});

test("the lesson link opens the lesson report form", () => {
  render(<ReportFooterLink target={{ type: "lesson", id: ID }} />, { wrapper });

  fireEvent.press(screen.getByText("Сообщить"));

  expect(screen.getByText("Нашли ошибку в уроке?")).toBeTruthy();
  expect(screen.getByText("Что не так с уроком?")).toBeTruthy();
});
