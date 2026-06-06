// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { CompactCourseCard } from "./compact-course-card";
import type { LessonInfo } from "./course-continue-card";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseLesson: LessonInfo = {
  order: 1,
  title: "Открытые аккорды",
  remainingSongs: 2,
  videoRemaining: true,
  progressPct: 0,
  hasProgress: false,
};

describe("CompactCourseCard", () => {
  test("renders lesson title and course name", () => {
    render(<CompactCourseCard lesson={baseLesson} courseTitle="Основы гитары" />, {
      wrapper,
    });
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
    expect(screen.getByText(/Основы гитары/)).toBeTruthy();
  });

  test("shows Начать when hasProgress is false", () => {
    render(<CompactCourseCard lesson={baseLesson} courseTitle="Курс" />, { wrapper });
    expect(screen.getByText("Начать")).toBeTruthy();
  });

  test("shows Продолжить when hasProgress is true", () => {
    render(
      <CompactCourseCard
        lesson={{ ...baseLesson, hasProgress: true }}
        courseTitle="Курс"
      />,
      { wrapper },
    );
    expect(screen.getByText("Продолжить")).toBeTruthy();
  });

  test("shows remaining items description when songs and video remain", () => {
    render(<CompactCourseCard lesson={baseLesson} courseTitle="Курс" />, { wrapper });
    expect(screen.getByText("осталось видео и 2 песни")).toBeTruthy();
  });

  test("hides remaining items when nothing remains", () => {
    render(
      <CompactCourseCard
        lesson={{ ...baseLesson, remainingSongs: 0, videoRemaining: false }}
        courseTitle="Курс"
      />,
      { wrapper },
    );
    expect(screen.getByText("Начать")).toBeTruthy();
  });

  test("calls onPress when button is pressed", () => {
    const onPress = jest.fn();
    render(
      <CompactCourseCard lesson={baseLesson} courseTitle="Курс" onPress={onPress} />,
      { wrapper },
    );
    fireEvent.press(screen.getByText("Начать"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
