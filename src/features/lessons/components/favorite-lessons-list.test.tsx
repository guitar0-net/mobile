// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { useFavoriteLessons } from "../queries";
import { FavoriteLessonsList } from "./favorite-lessons-list";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("../queries", () => ({
  useFavoriteLessons: jest.fn(),
}));

const mockUseFavoriteLessons = useFavoriteLessons as jest.Mock;

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const favoriteLesson = {
  lessonUuid: "lesson-1",
  title: "Открытые аккорды",
  courseUuid: "course-1",
  courseTitle: "Основы гитары",
  order: 1,
  totalInCourse: 5,
};

describe("FavoriteLessonsList", () => {
  test("renders an empty-state message when there are no favorites", () => {
    mockUseFavoriteLessons.mockReturnValue({ lessons: [], isLoading: false });
    render(<FavoriteLessonsList />, { wrapper });
    expect(screen.getByText("У вас пока нет избранных уроков")).toBeTruthy();
  });

  test("does not show the empty state while still loading", () => {
    mockUseFavoriteLessons.mockReturnValue({ lessons: [], isLoading: true });
    render(<FavoriteLessonsList />, { wrapper });
    expect(screen.queryByText("У вас пока нет избранных уроков")).toBeNull();
  });

  test("renders a card for each favorited lesson", () => {
    mockUseFavoriteLessons.mockReturnValue({
      lessons: [favoriteLesson],
      isLoading: false,
    });
    render(<FavoriteLessonsList />, { wrapper });
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
    expect(screen.getByText("Основы гитары")).toBeTruthy();
  });
});
