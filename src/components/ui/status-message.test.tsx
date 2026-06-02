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

  test("renders with success variant", () => {
    const { toJSON } = render(<StatusMessage variant="success">Готово</StatusMessage>, {
      wrapper,
    });
    expect(toJSON()).toBeTruthy();
  });

  test("renders with warning variant", () => {
    const { toJSON } = render(
      <StatusMessage variant="warning">Нет соединения</StatusMessage>,
      { wrapper },
    );
    expect(toJSON()).toBeTruthy();
  });

  test("renders with error variant", () => {
    const { toJSON } = render(
      <StatusMessage variant="error">Ошибка загрузки</StatusMessage>,
      { wrapper },
    );
    expect(toJSON()).toBeTruthy();
  });

  test("accepts a custom icon", () => {
    const { toJSON } = render(
      <StatusMessage variant="success" icon={{ ios: "star.fill", android: "star" }}>
        Достижение
      </StatusMessage>,
      { wrapper },
    );
    expect(toJSON()).toBeTruthy();
  });
});
