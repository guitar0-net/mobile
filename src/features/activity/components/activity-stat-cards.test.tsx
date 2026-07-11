// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { ActivityStatCards } from "./activity-stat-cards";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("ActivityStatCards", () => {
  test("renders the streak count with correct plural form", () => {
    render(<ActivityStatCards streakDays={1} lessonsCompleted={0} totalSeconds={0} />, {
      wrapper,
    });
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("день подряд")).toBeTruthy();
  });

  test("renders the lessons completed count with correct plural form", () => {
    render(
      <ActivityStatCards streakDays={0} lessonsCompleted={11} totalSeconds={0} />,
      { wrapper },
    );
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText("уроков")).toBeTruthy();
  });

  test("renders total played time formatted as hours and minutes", () => {
    render(
      <ActivityStatCards
        streakDays={0}
        lessonsCompleted={0}
        totalSeconds={73 * 3600 + 35 * 60}
      />,
      { wrapper },
    );
    expect(screen.getByText("73ч 35м")).toBeTruthy();
    expect(screen.getByText("играли всего")).toBeTruthy();
  });
});
