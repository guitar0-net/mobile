// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import type { LessonInfo } from "./course-continue-card";
import { FeaturedCourseCard } from "./featured-course-card";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseLesson: LessonInfo = {
  order: 2,
  title: "Баррэ",
  remainingSongs: 3,
  videoRemaining: false,
  progressPct: 40,
  hasProgress: true,
};

describe("FeaturedCourseCard", () => {
  test("renders lesson title and course name", () => {
    render(<FeaturedCourseCard lesson={baseLesson} courseTitle="Продвинутый курс" />, {
      wrapper,
    });
    expect(screen.getByText("Баррэ")).toBeTruthy();
    expect(screen.getByText(/Продвинутый курс/)).toBeTruthy();
  });

  test("shows Продолжить when hasProgress is true", () => {
    render(<FeaturedCourseCard lesson={baseLesson} courseTitle="Курс" />, { wrapper });
    expect(screen.getByText("Продолжить")).toBeTruthy();
  });

  test("shows Начать when hasProgress is false", () => {
    render(
      <FeaturedCourseCard
        lesson={{ ...baseLesson, hasProgress: false }}
        courseTitle="Курс"
      />,
      { wrapper },
    );
    expect(screen.getByText("Начать")).toBeTruthy();
  });

  test("shows remaining songs description when songs remain", () => {
    render(
      <FeaturedCourseCard
        lesson={{ ...baseLesson, remainingSongs: 2 }}
        courseTitle="Курс"
      />,
      { wrapper },
    );
    expect(screen.getByText("остались 2 песни")).toBeTruthy();
  });

  test("hides remaining description when nothing remains", () => {
    render(
      <FeaturedCourseCard
        lesson={{ ...baseLesson, remainingSongs: 0, videoRemaining: false }}
        courseTitle="Курс"
      />,
      { wrapper },
    );
    expect(screen.getByText("Продолжить")).toBeTruthy();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(
      <FeaturedCourseCard lesson={baseLesson} courseTitle="Курс" onPress={onPress} />,
      { wrapper },
    );
    fireEvent.press(screen.getByText("Продолжить"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
