// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { ThemeProvider } from "@/lib/themes";

import { LessonStatus } from "./lesson-status";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderStatus(songCount: number) {
  return render(<LessonStatus lessonId="lesson-1" songCount={songCount} />, {
    wrapper,
  });
}

beforeEach(() => {
  resetSettingsForTesting();
});

describe("LessonStatus", () => {
  test("lists the video and every song for an untouched lesson", () => {
    renderStatus(2);
    expect(screen.getByText("Осталось видео и 2 песни")).toBeTruthy();
  });

  test("drops the video from the remaining steps once it is viewed", () => {
    useSettingsStore.getState().setVideoViewed("lesson-1", true);
    renderStatus(2);
    expect(screen.getByText("Остались 2 песни")).toBeTruthy();
  });

  test("keeps asking for the video when only the songs are done", () => {
    useSettingsStore.getState().setSongCompleted("lesson-1", "song-1", true);
    renderStatus(1);
    expect(screen.getByText("Осталось видео")).toBeTruthy();
  });

  test("turns into the completed label when the last step is done", () => {
    useSettingsStore.getState().setVideoViewed("lesson-1", true);
    renderStatus(1);
    expect(screen.queryByText("Пройден")).toBeNull();

    act(() => {
      useSettingsStore.getState().setSongCompleted("lesson-1", "song-1", true);
    });
    expect(screen.getByText("Пройден")).toBeTruthy();
  });

  test("a lesson without songs is completed by the video alone", () => {
    useSettingsStore.getState().setVideoViewed("lesson-1", true);
    renderStatus(0);
    expect(screen.getByText("Пройден")).toBeTruthy();
  });
});
