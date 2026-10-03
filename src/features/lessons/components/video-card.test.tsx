// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert, Linking } from "react-native";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import type { VideoDownloadHook } from "../use-video-download";
import { useVideoDownload } from "../use-video-download";
import { VideoCard } from "./video-card";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("../use-video-download", () => ({
  useVideoDownload: jest.fn(),
}));

const mockUseVideoDownload = useVideoDownload as jest.MockedFunction<
  typeof useVideoDownload
>;

const mockRecordLessonViewed = jest.fn();

jest.mock("@/features/activity", () => ({
  recordLessonViewed: (...args: unknown[]) => mockRecordLessonViewed(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function makeHook(overrides: Partial<VideoDownloadHook> = {}): VideoDownloadHook {
  return {
    status: "idle",
    progress: 0,
    stalled: false,
    startDownload: jest.fn(),
    cancelDownload: jest.fn(),
    deleteDownload: jest.fn(),
    ...overrides,
  };
}

function renderCard(hookOverrides: Partial<VideoDownloadHook> = {}) {
  mockUseVideoDownload.mockReturnValue(makeHook(hookOverrides));
  return render(
    <VideoCard
      lessonId="lesson-1"
      title="Первые аккорды"
      youtubeUrl="https://youtube.com/watch?v=test"
      dbDownloadStatus="idle"
    />,
    { wrapper },
  );
}

beforeEach(() => {
  resetSettingsForTesting();
  mockPush.mockReset();
  mockRecordLessonViewed.mockReset();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("VideoCard", () => {
  test("shows download button when idle", () => {
    renderCard({ status: "idle" });
    expect(screen.getByLabelText("Скачать видео")).toBeTruthy();
  });

  test("shows offline split button when downloaded", () => {
    renderCard({ status: "downloaded" });
    expect(screen.getByText("Оффлайн")).toBeTruthy();
  });

  test("pressing download button calls startDownload when idle", () => {
    const startDownload = jest.fn();
    renderCard({ status: "idle", startDownload });
    fireEvent.press(screen.getByLabelText("Скачать видео"));
    expect(startDownload).toHaveBeenCalledTimes(1);
  });

  test("pressing download button calls cancelDownload when downloading", () => {
    const cancelDownload = jest.fn();
    renderCard({ status: "downloading", progress: 30, cancelDownload });
    fireEvent.press(screen.getByLabelText("Отменить загрузку"));
    expect(cancelDownload).toHaveBeenCalledTimes(1);
  });

  test("pressing retry calls startDownload when failed", () => {
    const startDownload = jest.fn();
    renderCard({ status: "failed", startDownload });
    fireEvent.press(screen.getByLabelText("Повторить загрузку"));
    expect(startDownload).toHaveBeenCalledTimes(1);
  });

  test("explains a stalled download", () => {
    renderCard({ status: "downloading", stalled: true });
    expect(screen.getByText(/сервер не отвечает/)).toBeTruthy();
  });

  test("shows no stall hint while the download is receiving data", () => {
    renderCard({ status: "downloading", stalled: false });
    expect(screen.queryByText(/сервер не отвечает/)).toBeNull();
  });

  test("pressing offline button navigates with source=offline", () => {
    renderCard({ status: "downloaded" });
    fireEvent.press(screen.getByText("Оффлайн"));
    expect(mockPush).toHaveBeenCalledWith("/video/lesson-1?source=offline");
  });

  test("pressing online button navigates with source=online", () => {
    renderCard({ status: "idle" });
    fireEvent.press(screen.getByText("Онлайн"));
    expect(mockPush).toHaveBeenCalledWith("/video/lesson-1?source=online");
  });

  test("pressing the YouTube button records the lesson as viewed", () => {
    renderCard({ status: "idle" });
    fireEvent.press(screen.getByText("YouTube"));
    expect(mockRecordLessonViewed).toHaveBeenCalledWith("lesson-1", "Первые аккорды");
  });

  test("pressing the online/offline button records the lesson as viewed", () => {
    renderCard({ status: "idle" });
    fireEvent.press(screen.getByText("Онлайн"));
    expect(mockRecordLessonViewed).toHaveBeenCalledWith("lesson-1", "Первые аккорды");
  });

  test("pressing delete button shows confirmation alert", () => {
    renderCard({ status: "downloaded" });
    fireEvent.press(screen.getByLabelText("Удалить загрузку"));
    expect(Alert.alert).toHaveBeenCalledWith(
      "Удалить загрузку",
      "Видео будет удалено с устройства.",
      expect.any(Array),
    );
  });
});
