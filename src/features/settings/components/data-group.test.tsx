// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import { resetSyncForTesting } from "@/lib/sync/__tests__/testing";
import { useSyncStore } from "@/lib/sync/store";
import type { AppSyncDeps } from "@/lib/sync/use-app-sync";
import { ThemeProvider } from "@/lib/themes";

import { DataGroup } from "./data-group";

const mockDb = {} as Parameters<AppSyncDeps["syncAll"]>[0];

function makeDeps(overrides?: Partial<AppSyncDeps>): AppSyncDeps {
  return {
    initDb: jest.fn().mockResolvedValue(mockDb),
    syncAll: jest.fn().mockResolvedValue("v1.0"),
    ...overrides,
  };
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

jest.mock("@/features/lessons", () => ({
  useDownloadedVideos: () => mockUseDownloadedVideos(),
}));

function renderGroup({
  deps,
  wifiOnlyDownloads = false,
  setWifiOnlyDownloads = jest.fn(),
  data,
}: {
  deps?: Partial<AppSyncDeps>;
  wifiOnlyDownloads?: boolean;
  setWifiOnlyDownloads?: (value: boolean) => void;
  data?: { lessonUuid: string; title: string; sizeBytes: number }[];
} = {}) {
  mockUseWifiOnlyDownloads.mockReturnValue({ wifiOnlyDownloads, setWifiOnlyDownloads });
  mockUseDownloadedVideos.mockReturnValue({ data });
  return render(<DataGroup deps={deps ?? makeDeps()} />, { wrapper });
}

beforeEach(() => {
  resetSyncForTesting();
  // Settings is only reachable once the initial sync has completed.
  useSyncStore.setState({ isInitialSyncDone: true });
  mockPush.mockReset();
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

  test("successful manual sync updates the last-synced label", async () => {
    const deps = makeDeps();
    renderGroup({ deps });

    fireEvent.press(screen.getByText("Синхронизировать"));

    await waitFor(() => expect(screen.getByText(/только что/i)).toBeTruthy());
  });

  test("shows a loading state while a manual sync is in progress", async () => {
    let resolveSync: (version: string) => void = () => {};
    const deps = makeDeps({
      syncAll: jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSync = resolve;
          }),
      ),
    });
    renderGroup({ deps });

    // Let the silent automatic mount-sync resolve first, then trigger the
    // manual sync we actually want to observe mid-flight.
    await waitFor(() => expect(deps.syncAll).toHaveBeenCalledTimes(1));
    resolveSync("v1.0");
    await waitFor(() => expect(screen.getByText(/только что/i)).toBeTruthy());

    fireEvent.press(screen.getByText("Синхронизировать"));
    await waitFor(() => expect(deps.syncAll).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText("Синхронизация…")).toBeTruthy());

    resolveSync("v1.1");
    await waitFor(() => expect(screen.getByText("Синхронизировать")).toBeTruthy());
  });

  test("a failed manual sync shows a visible error", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    renderGroup({ deps });

    fireEvent.press(screen.getByText("Синхронизировать"));

    await waitFor(() =>
      expect(screen.getByText(/не удалось синхронизировать/i)).toBeTruthy(),
    );
  });

  test("a failed automatic background sync stays silent", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    renderGroup({ deps });

    await waitFor(() => expect(deps.syncAll).toHaveBeenCalledTimes(1));

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
});
