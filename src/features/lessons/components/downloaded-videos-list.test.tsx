// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { useDownloadedVideos } from "../queries";
import { DownloadedVideosList } from "./downloaded-videos-list";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock("../queries", () => ({
  useDownloadedVideos: jest.fn(),
}));

const mockUseDownloadedVideos = useDownloadedVideos as jest.MockedFunction<
  typeof useDownloadedVideos
>;

jest.mock("./downloaded-video-item", () => {
  const { Text } = jest.requireActual("react-native");
  return {
    DownloadedVideoItem: ({ title }: { title: string }) => <Text>{title}</Text>,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function mockQuery(overrides: Partial<ReturnType<typeof useDownloadedVideos>>) {
  mockUseDownloadedVideos.mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useDownloadedVideos>);
}

beforeEach(() => {
  resetSettingsForTesting();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DownloadedVideosList", () => {
  test("shows an empty state when there are no downloaded videos", () => {
    mockQuery({ data: [] });
    render(<DownloadedVideosList />, { wrapper });
    expect(screen.getByText("Нет загруженных видео")).toBeTruthy();
  });

  test("renders one row per downloaded video", () => {
    mockQuery({
      data: [
        { lessonUuid: "l1", title: "Открытые аккорды", sizeBytes: 1_000_000 },
        { lessonUuid: "l2", title: "Баррэ", sizeBytes: 2_000_000 },
      ],
    });
    render(<DownloadedVideosList />, { wrapper });
    expect(screen.getByText("Открытые аккорды")).toBeTruthy();
    expect(screen.getByText("Баррэ")).toBeTruthy();
  });

  test("does not show the empty state while still loading", () => {
    mockQuery({ data: undefined, isLoading: true });
    render(<DownloadedVideosList />, { wrapper });
    expect(screen.queryByText("Нет загруженных видео")).toBeNull();
  });
});
