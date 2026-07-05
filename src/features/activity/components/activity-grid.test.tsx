// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import type { ActivityDayBucket } from "../logic";
import { ActivityGrid } from "./activity-grid";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const history: ActivityDayBucket[] = [
  { date: "2026-01-04", totalSeconds: 0 }, // bucket 0
  { date: "2026-01-05", totalSeconds: 120 }, // bucket 1
  { date: "2026-01-06", totalSeconds: 600 }, // bucket 2
  { date: "2026-01-07", totalSeconds: 1200 }, // bucket 3
  { date: "2026-01-08", totalSeconds: 2400 }, // bucket 4
  { date: "2026-01-09", totalSeconds: 4000 }, // bucket 5
];

describe("ActivityGrid", () => {
  test("renders one shaded cell per day in history", () => {
    render(<ActivityGrid history={history} />, { wrapper });
    expect(screen.getAllByTestId(/^activity-cell-/)).toHaveLength(history.length);
  });

  test("gives each cell a distinct fill for its intensity bucket", () => {
    render(<ActivityGrid history={history} />, { wrapper });
    const fills = history.map(
      (day) => screen.getByTestId(`activity-cell-${day.date}`).props.fill,
    );
    expect(new Set(fills).size).toBe(history.length);
  });

  test("renders no cells for an empty history", () => {
    render(<ActivityGrid history={[]} />, { wrapper });
    expect(screen.queryAllByTestId(/^activity-cell-/)).toHaveLength(0);
  });
});
