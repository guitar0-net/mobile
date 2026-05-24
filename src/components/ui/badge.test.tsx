// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";

import { Badge } from "./badge";

describe("Badge", () => {
  test("renders children as text", () => {
    render(<Badge>Оффлайн</Badge>);
    expect(screen.getByText("Оффлайн")).toBeTruthy();
  });

  test("renders with icon", () => {
    render(<Badge icon={{ ios: "clock", android: "schedule" }}>14:32</Badge>);
    expect(screen.getByText("14:32")).toBeTruthy();
  });

  test("renders without icon", () => {
    render(<Badge variant="outline">Барре</Badge>);
    expect(screen.getByText("Барре")).toBeTruthy();
  });
});
