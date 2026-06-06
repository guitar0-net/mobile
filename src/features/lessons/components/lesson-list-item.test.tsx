// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import type { CourseLessonRow } from "../queries";
import { LessonListItem } from "./lesson-list-item";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseLesson: CourseLessonRow = {
  lessonUuid: "lesson-1",
  title: "Первые аккорды",
  order: 1,
  songCount: 2,
  duration: 600,
  songs: [
    { uuid: "song-a", title: "Am" },
    { uuid: "song-b", title: "Em" },
  ],
};

describe("LessonListItem", () => {
  test("renders lesson title", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Первые аккорды")).toBeTruthy();
  });

  test("renders song titles as chips", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Am")).toBeTruthy();
    expect(screen.getByText("Em")).toBeTruthy();
  });

  test("renders all completed songs as chips when all are done", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="completed"
        completedSongIds={["song-a", "song-b"]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Am")).toBeTruthy();
    expect(screen.getByText("Em")).toBeTruthy();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        onPress={onPress}
      />,
      { wrapper },
    );
    fireEvent.press(screen.getByText("Первые аккорды"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("neutral state renders order number", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("1")).toBeTruthy();
  });

  test("completed state renders 'Пройден' label", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="completed"
        completedSongIds={["song-a", "song-b"]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Пройден")).toBeTruthy();
  });

  test("continue state renders 'Продолжить' label and order number", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="continue"
        completedSongIds={[]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Продолжить")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  test("in-progress state renders 'В процессе' label", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="in-progress"
        completedSongIds={["song-a"]}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("В процессе")).toBeTruthy();
  });
});
