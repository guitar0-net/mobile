// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { ReportFooterLink } from "./report-footer-link";

const mockPush = jest.fn();
let mockSegments = ["song", "[id]"];
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useSegments: () => mockSegments,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const ID = "0b6a2f0e-8f3e-4a4e-9d4b-6c1d2f3a4b5c";

beforeEach(() => mockPush.mockClear());

test("the song link opens the song report from the song screen", () => {
  mockSegments = ["song", "[id]"];
  render(<ReportFooterLink target={{ type: "song", id: ID }} />, { wrapper });

  expect(screen.getByText("Нашли ошибку в песне?")).toBeTruthy();
  fireEvent.press(screen.getByText("Сообщить"));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/report",
    params: { type: "song", id: ID, source: "song_footer", from: "/song/[id]" },
  });
});

test("the lesson link opens the lesson report from the lesson screen", () => {
  mockSegments = ["lesson", "[id]"];
  render(<ReportFooterLink target={{ type: "lesson", id: ID }} />, { wrapper });

  expect(screen.getByText("Нашли ошибку в уроке?")).toBeTruthy();
  fireEvent.press(screen.getByText("Сообщить"));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/report",
    params: { type: "lesson", id: ID, source: "lesson_footer", from: "/lesson/[id]" },
  });
});
