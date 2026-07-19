// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import { ThemeProvider } from "@/lib/themes";

import { VideoGroup } from "./video-group";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseWifiOnlyDownloads = jest.fn();

jest.mock("@/features/settings", () => ({
  ...jest.requireActual("@/features/settings"),
  useWifiOnlyDownloads: () => mockUseWifiOnlyDownloads(),
}));

const mockUseDownloadedVideos = jest.fn();

jest.mock("@/features/lessons", () => ({
  useDownloadedVideos: () => mockUseDownloadedVideos(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderGroup({
  wifiOnlyDownloads = false,
  setWifiOnlyDownloads = jest.fn(),
  data,
}: {
  wifiOnlyDownloads?: boolean;
  setWifiOnlyDownloads?: (value: boolean) => void;
  data?: { lessonUuid: string; title: string; sizeBytes: number }[];
} = {}) {
  mockUseWifiOnlyDownloads.mockReturnValue({ wifiOnlyDownloads, setWifiOnlyDownloads });
  mockUseDownloadedVideos.mockReturnValue({ data });
  return render(<VideoGroup />, { wrapper });
}

beforeEach(() => {
  mockPush.mockReset();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VideoGroup", () => {
  test("renders the group title and wifi-only toggle label", () => {
    renderGroup();
    expect(screen.getByText("Видео")).toBeTruthy();
    expect(screen.getByText("Скачивать только по Wi-Fi")).toBeTruthy();
  });

  test("toggle reflects the current wifiOnlyDownloads value", () => {
    renderGroup({ wifiOnlyDownloads: true });
    expect(screen.UNSAFE_getByType(Switch).props.value).toBe(true);
  });

  test("toggling calls setWifiOnlyDownloads with the new value", () => {
    const setWifiOnlyDownloads = jest.fn();
    renderGroup({ wifiOnlyDownloads: false, setWifiOnlyDownloads });
    fireEvent(screen.UNSAFE_getByType(Switch), "valueChange", true);
    expect(setWifiOnlyDownloads).toHaveBeenCalledWith(true);
  });

  test('shows "0 уроков · 0.0 МБ" when nothing is downloaded yet', () => {
    renderGroup({ data: [] });
    expect(screen.getByText("0 уроков · 0.0 МБ")).toBeTruthy();
  });

  test("summarizes lesson count and total size across downloaded videos", () => {
    renderGroup({
      data: [
        { lessonUuid: "l1", title: "A", sizeBytes: 1_500_000 },
        { lessonUuid: "l2", title: "B", sizeBytes: 2_500_000 },
      ],
    });
    expect(screen.getByText("2 урока · 3.8 МБ")).toBeTruthy();
  });

  test("tapping the summary row navigates to the downloaded videos screen", () => {
    renderGroup({ data: [] });
    fireEvent.press(screen.getByText("Загруженные видео"));
    expect(mockPush).toHaveBeenCalledWith("/settings/downloaded-videos");
  });
});
