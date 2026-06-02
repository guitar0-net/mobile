// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";

import { CourseProgressCard } from "./CourseProgressCard";

describe("CourseProgressCard", () => {
  test("renders course title", () => {
    render(
      <CourseProgressCard
        courseTitle="Основы гитары"
        completed={3}
        total={10}
        pct={30}
      />,
    );
    expect(screen.getByText("Основы гитары")).toBeTruthy();
  });

  test("renders completed and total lesson count", () => {
    render(<CourseProgressCard courseTitle="Курс" completed={3} total={10} pct={30} />);
    expect(screen.getByText("3 из 10 уроков")).toBeTruthy();
  });

  test("renders percentage", () => {
    render(<CourseProgressCard courseTitle="Курс" completed={3} total={10} pct={30} />);
    expect(screen.getByText("30%")).toBeTruthy();
  });

  test("renders zero progress", () => {
    render(<CourseProgressCard courseTitle="Курс" completed={0} total={5} pct={0} />);
    expect(screen.getByText("0 из 5 уроков")).toBeTruthy();
    expect(screen.getByText("0%")).toBeTruthy();
  });

  test("renders full progress", () => {
    render(<CourseProgressCard courseTitle="Курс" completed={5} total={5} pct={100} />);
    expect(screen.getByText("5 из 5 уроков")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();
  });
});
