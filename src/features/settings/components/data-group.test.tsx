// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import type { SyncResult } from "@/features/lessons/sync";
import type { AppDb } from "@/lib/db";
import { ApiError } from "@/lib/network";
import type { SyncTrigger } from "@/lib/sync";
import { resetSyncForTesting } from "@/lib/sync/__tests__/testing";
import { runContentSync } from "@/lib/sync/content-sync";
import { ThemeProvider } from "@/lib/themes";

import { DataGroup } from "./data-group";

jest.mock("@/lib/analytics", () => ({
  capture: jest.fn(),
  captureException: jest.fn(),
}));

const unchanged: SyncResult = { previousVersion: "v1", version: "v1" };

function contentDeps(syncAll: jest.Mock) {
  return {
    getDb: () => ({}) as AppDb,
    syncAll,
    invalidateContentQueries: jest.fn(),
  };
}

function syncWith(syncAll: jest.Mock) {
  return jest.fn((trigger: SyncTrigger) =>
    runContentSync(trigger, contentDeps(syncAll)),
  );
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

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
const mockUseSchemeImageStatus = jest.fn();

jest.mock("@/features/lessons", () => ({
  useDownloadedVideos: () => mockUseDownloadedVideos(),
  useSchemeImageStatus: () => mockUseSchemeImageStatus(),
}));

function renderGroup({
  sync = syncWith(jest.fn().mockResolvedValue(unchanged)),
  wifiOnlyDownloads = false,
  setWifiOnlyDownloads = jest.fn(),
  data,
  schemeImages = { pending: 0, total: 135, isRunning: false },
}: {
  sync?: (trigger: SyncTrigger) => Promise<void>;
  wifiOnlyDownloads?: boolean;
  setWifiOnlyDownloads?: (value: boolean) => void;
  data?: { lessonUuid: string; title: string; sizeBytes: number }[];
  schemeImages?: { pending: number; total: number; isRunning: boolean };
} = {}) {
  mockUseWifiOnlyDownloads.mockReturnValue({ wifiOnlyDownloads, setWifiOnlyDownloads });
  mockUseDownloadedVideos.mockReturnValue({ data });
  mockUseSchemeImageStatus.mockReturnValue(schemeImages);
  return render(<DataGroup runContentSync={sync} />, { wrapper });
}

beforeEach(() => {
  resetSyncForTesting();
  mockPush.mockReset();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("DataGroup", () => {
  test("renders the section header", () => {
    renderGroup();
    expect(screen.getByText("Данные")).toBeTruthy();
  });

  test("renders a never-synced label before any sync has completed", () => {
    renderGroup();
    expect(screen.getByText(/ещё не выполнялась/i)).toBeTruthy();
  });

  test("renders a Sync now action", () => {
    renderGroup();
    expect(screen.getByText("Синхронизировать")).toBeTruthy();
  });

  test("opening the screen does not start a sync", () => {
    const sync = syncWith(jest.fn().mockResolvedValue(unchanged));
    renderGroup({ sync });

    expect(sync).not.toHaveBeenCalled();
  });

  test("pressing the button starts a manual sync and updates the last-synced label", async () => {
    const sync = syncWith(jest.fn().mockResolvedValue(unchanged));
    renderGroup({ sync });

    fireEvent.press(screen.getByText("Синхронизировать"));

    expect(sync).toHaveBeenCalledWith("manual");
    await waitFor(() => expect(screen.getByText(/только что/i)).toBeTruthy());
  });

  test("shows a loading state while a manual sync is in progress", async () => {
    let finishSync: (result: SyncResult) => void = () => {};
    const syncAll = jest.fn(
      () =>
        new Promise<SyncResult>((resolve) => {
          finishSync = resolve;
        }),
    );
    renderGroup({ sync: syncWith(syncAll) });

    fireEvent.press(screen.getByText("Синхронизировать"));
    await waitFor(() => expect(screen.getByText("Синхронизация…")).toBeTruthy());

    finishSync(unchanged);
    await waitFor(() => expect(screen.getByText("Синхронизировать")).toBeTruthy());
  });

  test("a background sync in progress does not show the loading state", async () => {
    let finishSync: (result: SyncResult) => void = () => {};
    const syncAll = jest.fn(
      () =>
        new Promise<SyncResult>((resolve) => {
          finishSync = resolve;
        }),
    );
    renderGroup();

    const backgroundSync = runContentSync("launch", contentDeps(syncAll));
    await waitFor(() => expect(syncAll).toHaveBeenCalled());

    expect(screen.queryByText("Синхронизация…")).toBeNull();
    finishSync(unchanged);
    await backgroundSync;
  });

  test("a failed manual sync shows a visible error", async () => {
    renderGroup({ sync: syncWith(jest.fn().mockRejectedValue(new Error("Network"))) });

    fireEvent.press(screen.getByText("Синхронизировать"));

    await waitFor(() =>
      expect(screen.getByText(/не удалось синхронизировать/i)).toBeTruthy(),
    );
  });

  test("a rate-limited sync does not tell the user to check their connection", async () => {
    renderGroup({ sync: syncWith(jest.fn().mockRejectedValue(new ApiError(503))) });

    fireEvent.press(screen.getByText("Синхронизировать"));

    await waitFor(() =>
      expect(screen.getByText(/попробуйте через минуту/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/подключение к интернету/i)).toBeNull();
  });

  test("a failed background sync stays silent", async () => {
    renderGroup();

    await runContentSync(
      "launch",
      contentDeps(jest.fn().mockRejectedValue(new Error("Network"))),
    );

    expect(screen.queryByText(/не удалось синхронизировать/i)).toBeNull();
  });

  test("renders the wifi-only toggle label", () => {
    renderGroup();
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

  test("shows how many scheme images are downloaded so far", () => {
    renderGroup({ schemeImages: { pending: 7, total: 135, isRunning: false } });
    expect(screen.getByText("128 из 135")).toBeTruthy();
  });

  test("marks scheme images as loading while a download pass runs", () => {
    renderGroup({ schemeImages: { pending: 7, total: 135, isRunning: true } });
    expect(screen.getByText("Загрузка… 128 из 135")).toBeTruthy();
  });

  test("reports all scheme images downloaded once nothing is pending", () => {
    renderGroup({ schemeImages: { pending: 0, total: 135, isRunning: false } });
    expect(screen.getByText("Все загружены")).toBeTruthy();
  });
});
