// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import type { FavoriteLessonRow } from "../queries";
import { FavoriteLessonCard } from "./favorite-lesson-card";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockReset();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const lesson: FavoriteLessonRow = {
  lessonUuid: "lesson-1",
  title: "Открытые аккорды",
  courseUuid: "course-1",
  courseTitle: "Основы гитары",
  order: 3,
  totalInCourse: 10,
};

describe("FavoriteLessonCard", () => {
  test("renders the lesson title", () => {
    render(<FavoriteLessonCard lesson={lesson} />, { wrapper });
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
  });

  test("renders the course title", () => {
    render(<FavoriteLessonCard lesson={lesson} />, { wrapper });
    expect(screen.getByText("Основы гитары")).toBeTruthy();
  });

  test("navigates to the lesson with its course, order, and total on press", () => {
    render(<FavoriteLessonCard lesson={lesson} />, { wrapper });
    fireEvent.press(screen.getByText("Открытые аккорды"));
    expect(mockPush).toHaveBeenCalledWith(
      "/lesson/lesson-1?courseId=course-1&order=3&total=10",
    );
  });
});
