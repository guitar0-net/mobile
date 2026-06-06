// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { StatusMessage } from "./status-message";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("StatusMessage", () => {
  test("renders children text", () => {
    render(<StatusMessage variant="success">Синхронизировано</StatusMessage>, {
      wrapper,
    });
    expect(screen.getByText("Синхронизировано")).toBeTruthy();
  });

  test("renders children text when a custom icon is provided", () => {
    render(
      <StatusMessage variant="success" icon={{ ios: "star.fill", android: "star" }}>
        Достижение
      </StatusMessage>,
      { wrapper },
    );
    expect(screen.getByText("Достижение")).toBeTruthy();
  });
});
