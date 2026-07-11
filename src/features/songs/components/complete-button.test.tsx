// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { CompleteButton } from "./complete-button";

const mockRecordSongCompletion = jest.fn();

jest.mock("@/features/activity", () => ({
  recordSongCompletion: (...args: unknown[]) => mockRecordSongCompletion(...args),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  resetSettingsForTesting();
  mockRecordSongCompletion.mockReset();
});

describe("CompleteButton", () => {
  test("pressing an incomplete song records completion", () => {
    render(
      <CompleteButton
        lessonId="lesson-1"
        lessonTitle="Урок 3"
        songId="song-1"
        songTitle="Кукушка"
        testID="complete-btn"
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByTestId("complete-btn"));

    expect(mockRecordSongCompletion).toHaveBeenCalledWith(
      "Урок 3",
      "song-1",
      "Кукушка",
      true,
    );
  });

  test("pressing an already-complete song records un-completion", () => {
    render(
      <CompleteButton
        lessonId="lesson-1"
        lessonTitle="Урок 3"
        songId="song-1"
        songTitle="Кукушка"
        testID="complete-btn"
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByTestId("complete-btn"));
    fireEvent.press(screen.getByTestId("complete-btn"));

    expect(mockRecordSongCompletion).toHaveBeenLastCalledWith(
      "Урок 3",
      "song-1",
      "Кукушка",
      false,
    );
  });
});
