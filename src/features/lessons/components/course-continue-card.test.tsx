// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { useContinueLesson } from "../queries";
import { CourseContinueCard } from "./course-continue-card";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../queries", () => ({
  useContinueLesson: jest.fn(),
}));

const mockUseContinueLesson = useContinueLesson as jest.Mock;

beforeEach(() => {
  resetSettingsForTesting();
  mockPush.mockReset();
  mockUseContinueLesson.mockReturnValue({ lesson: null });
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const mockLesson = {
  lessonUuid: "lesson-1",
  order: 1,
  title: "Открытые аккорды",
  songCount: 2,
  duration: null,
  songs: [],
};

describe("CourseContinueCard", () => {
  test("renders nothing when no lesson is available", () => {
    render(<CourseContinueCard courseUuid="course-1" courseTitle="Курс" />, {
      wrapper,
    });
    expect(screen.queryByText("Начать")).toBeNull();
    expect(screen.queryByText("Продолжить")).toBeNull();
  });

  test("renders compact card by default", () => {
    mockUseContinueLesson.mockReturnValue({ lesson: mockLesson, data: [mockLesson] });
    render(<CourseContinueCard courseUuid="course-1" courseTitle="Основы гитары" />, {
      wrapper,
    });
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
    expect(screen.getByText("Начать")).toBeTruthy();
  });

  test("renders featured card when variant is featured", () => {
    mockUseContinueLesson.mockReturnValue({ lesson: mockLesson, data: [mockLesson] });
    render(
      <CourseContinueCard
        courseUuid="course-1"
        courseTitle="Основы гитары"
        variant="featured"
      />,
      { wrapper },
    );
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
  });

  test("calls router.push with correct path when card is pressed", () => {
    mockUseContinueLesson.mockReturnValue({ lesson: mockLesson, data: [mockLesson] });
    render(<CourseContinueCard courseUuid="course-1" courseTitle="Курс" />, {
      wrapper,
    });
    fireEvent.press(screen.getByText("Начать"));
    expect(mockPush).toHaveBeenCalledWith(
      "/lesson/lesson-1?courseId=course-1&order=1&total=1",
    );
  });
});
