// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert } from "react-native";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import type { VideoDownloadHook } from "../use-video-download";
import { useVideoDownload } from "../use-video-download";
import { DownloadedVideoItem } from "./downloaded-video-item";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockInvalidateQueries = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

jest.mock("../use-video-download", () => ({
  useVideoDownload: jest.fn(),
}));

const mockUseVideoDownload = useVideoDownload as jest.MockedFunction<
  typeof useVideoDownload
>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function makeHook(overrides: Partial<VideoDownloadHook> = {}): VideoDownloadHook {
  return {
    status: "downloaded",
    progress: 0,
    startDownload: jest.fn(),
    cancelDownload: jest.fn(),
    deleteDownload: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderItem(hookOverrides: Partial<VideoDownloadHook> = {}) {
  mockUseVideoDownload.mockReturnValue(makeHook(hookOverrides));
  return render(
    <DownloadedVideoItem
      lessonUuid="lesson-1"
      title="Первые аккорды"
      sizeBytes={4_000_000}
    />,
    { wrapper },
  );
}

beforeEach(() => {
  resetSettingsForTesting();
  mockInvalidateQueries.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DownloadedVideoItem", () => {
  test("renders the lesson title and formatted size", () => {
    renderItem();
    expect(screen.getByText("Первые аккорды")).toBeTruthy();
    expect(screen.getByText("3.8 МБ")).toBeTruthy();
  });

  test("pressing delete shows the same confirmation copy as the lesson screen", () => {
    renderItem();
    fireEvent.press(screen.getByLabelText("Удалить загрузку"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Удалить загрузку",
      "Видео будет удалено с устройства.",
      expect.any(Array),
    );
  });

  test("confirming delete calls deleteDownload and refreshes the downloaded list", async () => {
    const deleteDownload = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(Alert, "alert").mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b) => b.text === "Удалить");
      confirm?.onPress?.();
    });
    renderItem({ deleteDownload });

    fireEvent.press(screen.getByLabelText("Удалить загрузку"));

    await Promise.resolve();
    expect(deleteDownload).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["lessons", "downloaded-videos"],
    });
  });
});
