// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import type { ReactTestInstance } from "react-test-renderer";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";

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

function iconNames(icons: ReactTestInstance[]): string[] {
  return icons.map((icon) => String(icon.props.name.ios));
}

describe("LessonListItem", () => {
  test("renders lesson title", () => {
    render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
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
        isFavorite={false}
        isDownloaded={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("В процессе")).toBeTruthy();
  });

  test("renders no markers when the lesson is neither favorited nor downloaded", () => {
    const { UNSAFE_queryAllByType } = render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        isFavorite={false}
        isDownloaded={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(iconNames(UNSAFE_queryAllByType(SymbolView))).toEqual([]);
  });

  test("renders the bookmark marker for a favorited lesson", () => {
    const { UNSAFE_queryAllByType } = render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        isFavorite
        isDownloaded={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(iconNames(UNSAFE_queryAllByType(SymbolView))).toEqual(["bookmark.fill"]);
  });

  test("renders the download marker for a downloaded lesson", () => {
    const { UNSAFE_queryAllByType } = render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        isFavorite={false}
        isDownloaded
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(iconNames(UNSAFE_queryAllByType(SymbolView))).toEqual([
      "arrow.down.to.line",
    ]);
  });

  test("renders the markers without a play icon on the continue lesson", () => {
    const { UNSAFE_queryAllByType } = render(
      <LessonListItem
        lesson={baseLesson}
        state="continue"
        completedSongIds={[]}
        isFavorite
        isDownloaded
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(iconNames(UNSAFE_queryAllByType(SymbolView))).toEqual([
      "bookmark.fill",
      "arrow.down.to.line",
    ]);
  });

  test("tints the markers with the muted color outside the continue lesson", () => {
    const { UNSAFE_queryAllByType } = render(
      <LessonListItem
        lesson={baseLesson}
        state="neutral"
        completedSongIds={[]}
        isFavorite
        isDownloaded
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    for (const icon of UNSAFE_queryAllByType(SymbolView)) {
      expect(icon.props.tintColor).toBe(THEME_DEFINITIONS.light["--color-muted-fg"]);
    }
  });
});
