// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import type { ActivityTimelineEntry } from "../queries";
import { LessonTimeline } from "./lesson-timeline";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function isoAt(date: Date, hours: number, minutes: number): string {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const now = new Date();
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);

const entries: ActivityTimelineEntry[] = [
  {
    id: "1",
    type: "song_completed",
    entityId: "song-1",
    title: "Мама",
    lessonTitle: "Урок 3",
    value: true,
    occurredAt: isoAt(now, 18, 4),
  },
  {
    id: "2",
    type: "lesson_video_viewed",
    entityId: "lesson-1",
    title: "Первые аккорды",
    lessonTitle: null,
    value: true,
    occurredAt: isoAt(now, 18, 20),
  },
  {
    id: "3",
    type: "song_completed",
    entityId: "song-2",
    title: "Аллилуйя",
    lessonTitle: "Урок 5",
    value: false,
    occurredAt: isoAt(yesterday, 20, 41),
  },
];

describe("LessonTimeline", () => {
  test("groups entries under Сегодня and Вчера headings", () => {
    render(<LessonTimeline entries={entries} />, { wrapper });
    expect(screen.getByText("Сегодня")).toBeTruthy();
    expect(screen.getByText("Вчера")).toBeTruthy();
  });

  test("shows a played-song entry quoted, without the lesson title", () => {
    render(<LessonTimeline entries={entries} />, { wrapper });
    expect(screen.getByText("Завершена песня «Мама»")).toBeTruthy();
  });

  test("shows a viewed-lesson entry with its honest wording", () => {
    render(<LessonTimeline entries={entries} />, { wrapper });
    expect(screen.getByText("Просмотрено: «Первые аккорды»")).toBeTruthy();
  });

  test("distinguishes an un-completed song from a completed one", () => {
    render(<LessonTimeline entries={entries} />, { wrapper });
    expect(screen.getByText("Отменено: «Аллилуйя» — Урок 5")).toBeTruthy();
  });

  test("shows each entry's time, not a full date", () => {
    render(<LessonTimeline entries={entries} />, { wrapper });
    expect(screen.getByText("18:04")).toBeTruthy();
    expect(screen.getByText("18:20")).toBeTruthy();
  });

  test("renders nothing when there are no entries", () => {
    render(<LessonTimeline entries={[]} />, { wrapper });
    expect(screen.queryByText("Сегодня")).toBeNull();
  });

  test("shows a loading indicator while fetching the next page", () => {
    render(<LessonTimeline entries={entries} isLoadingMore />, { wrapper });
    expect(screen.getByText("Загрузка…")).toBeTruthy();
  });

  test("hides the loading indicator when not fetching the next page", () => {
    render(<LessonTimeline entries={entries} />, { wrapper });
    expect(screen.queryByText("Загрузка…")).toBeNull();
  });
});
