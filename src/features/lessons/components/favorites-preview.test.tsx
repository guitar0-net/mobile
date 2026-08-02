// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { useFavoriteLessons } from "../queries";
import { FavoritesPreview } from "./favorites-preview";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../queries", () => ({
  useFavoriteLessons: jest.fn(),
}));

const mockUseFavoriteLessons = useFavoriteLessons as jest.Mock;

beforeEach(() => {
  mockPush.mockReset();
});

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

describe("FavoritesPreview", () => {
  test("renders nothing when there are no favorites", () => {
    mockUseFavoriteLessons.mockReturnValue({ lessons: [] });
    render(<FavoritesPreview />, { wrapper });
    expect(screen.queryByText("Избранное")).toBeNull();
  });

  test("renders the heading and favorited lessons when present", () => {
    mockUseFavoriteLessons.mockReturnValue({ lessons: [favoriteLesson] });
    render(<FavoritesPreview />, { wrapper });
    expect(screen.getByText("Избранное")).toBeTruthy();
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
  });

  test("navigates to the full favorites screen when the link is pressed", () => {
    mockUseFavoriteLessons.mockReturnValue({ lessons: [favoriteLesson] });
    render(<FavoritesPreview />, { wrapper });
    fireEvent.press(screen.getByText("Все"));
    expect(mockPush).toHaveBeenCalledWith("/favorites");
  });
});
