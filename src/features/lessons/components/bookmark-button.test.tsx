// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { useSettingsStore } from "@/features/settings/store";
import { ThemeProvider } from "@/lib/themes";

import { BookmarkButton } from "./bookmark-button";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("BookmarkButton", () => {
  test("adds lesson to favorites when pressed and not bookmarked", () => {
    const { UNSAFE_getByProps } = render(<BookmarkButton lessonId="lesson-1" />, {
      wrapper,
    });
    fireEvent.press(UNSAFE_getByProps({ hitSlop: 8 }));
    expect(useSettingsStore.getState().favorites).toContain("lesson-1");
  });

  test("removes lesson from favorites when pressed and already bookmarked", () => {
    useSettingsStore.setState({ favorites: ["lesson-1"] });
    const { UNSAFE_getByProps } = render(<BookmarkButton lessonId="lesson-1" />, {
      wrapper,
    });
    fireEvent.press(UNSAFE_getByProps({ hitSlop: 8 }));
    expect(useSettingsStore.getState().favorites).not.toContain("lesson-1");
  });
});
