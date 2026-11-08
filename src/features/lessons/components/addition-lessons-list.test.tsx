// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { ThemeProvider } from "@/lib/themes";

import type { AdditionLessonRow } from "../queries";
import { AdditionLessonsList } from "./addition-lessons-list";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  mockPush.mockReset();
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const breakdown: AdditionLessonRow = {
  lessonUuid: "breakdown-1",
  title: "Кино — Группа крови",
  courseUuid: "course-songs",
  courseTitle: "Разборы песен",
  order: 4,
  totalInCourse: 12,
  songCount: 1,
};

describe("AdditionLessonsList", () => {
  test("renders nothing when there are no addition lessons", () => {
    render(<AdditionLessonsList lessons={[]} />, { wrapper });
    expect(screen.queryByText("Дополнительные уроки")).toBeNull();
  });

  test("lists every addition lesson under the section title", () => {
    render(
      <AdditionLessonsList
        lessons={[
          breakdown,
          { ...breakdown, lessonUuid: "breakdown-2", title: "Сплин — Выхода нет" },
        ]}
      />,
      { wrapper },
    );
    expect(screen.getByText("Дополнительные уроки")).toBeTruthy();
    expect(screen.getByText("Кино — Группа крови")).toBeTruthy();
    expect(screen.getByText("Сплин — Выхода нет")).toBeTruthy();
  });

  test("opens the lesson in its own course on press", () => {
    render(<AdditionLessonsList lessons={[breakdown]} />, { wrapper });
    fireEvent.press(screen.getByText("Кино — Группа крови"));
    expect(mockPush).toHaveBeenCalledWith(
      "/lesson/breakdown-1?courseId=course-songs&order=4&total=12",
    );
  });

  test("marks the lesson as completed once its video and songs are done", () => {
    useSettingsStore.getState().setVideoViewed("breakdown-1", true);
    render(<AdditionLessonsList lessons={[breakdown]} />, { wrapper });
    expect(screen.queryByLabelText("Кино — Группа крови, пройден")).toBeNull();

    act(() => {
      useSettingsStore.getState().setSongCompleted("breakdown-1", "song-1", true);
    });
    expect(screen.getByLabelText("Кино — Группа крови, пройден")).toBeTruthy();
  });
});
