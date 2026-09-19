// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { AnnouncementsPreview } from "./announcements-preview";
import { getAnnouncements } from "./api";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("./api", () => ({
  getAnnouncements: jest.fn(),
}));

const mockGetAnnouncements = getAnnouncements as jest.MockedFunction<
  typeof getAnnouncements
>;

beforeEach(() => {
  resetSettingsForTesting();
  jest.clearAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

describe("AnnouncementsPreview", () => {
  test("renders section heading", () => {
    mockGetAnnouncements.mockResolvedValue({ results: [], count: 0 });
    render(<AnnouncementsPreview />, { wrapper });
    expect(screen.getByText("Что нового")).toBeTruthy();
  });

  test("renders announcements returned by query", async () => {
    mockGetAnnouncements.mockResolvedValue({
      results: [
        { uuid: "1", title: "Обновление 1.0", slug: "update-1", content: "Текст" },
      ],
      count: 1,
    });
    render(<AnnouncementsPreview />, { wrapper });
    await waitFor(() => expect(screen.getByText("Обновление 1.0")).toBeTruthy());
  });

  test("renders error state when query fails", async () => {
    mockGetAnnouncements.mockRejectedValue(new Error("Network error"));
    render(<AnnouncementsPreview />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Не удалось загрузить новости")).toBeTruthy(),
    );
  });

  test("retry button refetches announcements", async () => {
    mockGetAnnouncements.mockRejectedValue(new Error("Network error"));
    render(<AnnouncementsPreview />, { wrapper });
    await waitFor(() => expect(screen.getByText("Повторить")).toBeTruthy());
    fireEvent.press(screen.getByText("Повторить"));
    expect(mockGetAnnouncements).toHaveBeenCalledTimes(2);
  });

  test("see-all button navigates to announcements screen", async () => {
    mockGetAnnouncements.mockResolvedValue({ results: [], count: 0 });
    render(<AnnouncementsPreview />, { wrapper });
    fireEvent.press(screen.getByText("Все"));
    expect(mockPush).toHaveBeenCalledWith("/home/announcements");
  });
});
