// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { ReportSettingsRow } from "./report-settings-row";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useSegments: () => ["settings"],
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

test("the settings row opens an app report from the settings screen", () => {
  render(<ReportSettingsRow />, { wrapper });

  fireEvent.press(screen.getByText("Сообщить об ошибке или идее"));

  expect(mockPush).toHaveBeenCalledWith({
    pathname: "/report",
    params: { type: "app", source: "settings", from: "/settings" },
  });
});
