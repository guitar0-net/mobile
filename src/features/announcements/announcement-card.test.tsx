// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { AnnouncementCard } from "@/features/announcements";
import type { AnnouncementItem } from "@/features/announcements";
import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

// Import from index so the barrel file is executed and gets coverage.

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseItem: AnnouncementItem = {
  uuid: "ann-1",
  title: "Новый урок",
  slug: "new-lesson",
  content: "**Добавлен** урок по барре.",
};

describe("AnnouncementCard", () => {
  test("renders title", () => {
    render(<AnnouncementCard item={baseItem} />, { wrapper });
    expect(screen.getByText("Новый урок")).toBeTruthy();
  });

  test("strips markdown from content", () => {
    render(<AnnouncementCard item={baseItem} />, { wrapper });
    expect(screen.getByText("Добавлен урок по барре.")).toBeTruthy();
  });

  test("renders version badge for update announcement", () => {
    const item: AnnouncementItem = { ...baseItem, product_version: "1.2.0" };
    render(<AnnouncementCard item={item} />, { wrapper });
    expect(screen.getByText("v1.2.0")).toBeTruthy();
  });

  test("does not render version badge for regular announcement", () => {
    render(<AnnouncementCard item={baseItem} />, { wrapper });
    expect(screen.queryByText(/^v\d/)).toBeNull();
  });

  test("renders published_at date when provided", () => {
    const item: AnnouncementItem = {
      ...baseItem,
      published_at: "2026-01-15T10:00:00Z",
    };
    render(<AnnouncementCard item={item} />, { wrapper });
    expect(screen.getByText(/январ/i)).toBeTruthy();
  });

  test("does not render date when published_at is absent", () => {
    render(<AnnouncementCard item={baseItem} />, { wrapper });
    expect(screen.queryByText(/январ/i)).toBeNull();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(<AnnouncementCard item={baseItem} onPress={onPress} />, { wrapper });
    fireEvent.press(screen.getByText("Новый урок"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("renders without onPress handler", () => {
    const { toJSON } = render(<AnnouncementCard item={baseItem} />, { wrapper });
    expect(toJSON()).toBeTruthy();
  });
});
