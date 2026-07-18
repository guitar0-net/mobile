// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";

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

beforeEach(() => {
  resetSyncForTesting();
  // Settings is only reachable once the initial sync has completed.
  useSyncStore.setState({ isInitialSyncDone: true });
});

describe("DataGroup", () => {
  test("renders the section header", () => {
    render(<DataGroup deps={makeDeps()} />, { wrapper });
    expect(screen.getByText("Данные")).toBeTruthy();
  });

  test("renders a never-synced label before any sync has completed", () => {
    render(<DataGroup deps={makeDeps()} />, { wrapper });
    expect(screen.getByText(/ещё не выполнялась/i)).toBeTruthy();
  });

  test("renders a Sync now action", () => {
    render(<DataGroup deps={makeDeps()} />, { wrapper });
    expect(screen.getByText("Синхронизировать")).toBeTruthy();
  });

  test("successful manual sync updates the last-synced label", async () => {
    const deps = makeDeps();
    render(<DataGroup deps={deps} />, { wrapper });

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
    render(<DataGroup deps={deps} />, { wrapper });

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
    render(<DataGroup deps={deps} />, { wrapper });

    fireEvent.press(screen.getByText("Синхронизировать"));

    await waitFor(() =>
      expect(screen.getByText(/не удалось синхронизировать/i)).toBeTruthy(),
    );
  });

  test("a failed automatic background sync stays silent", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    render(<DataGroup deps={deps} />, { wrapper });

    await waitFor(() => expect(deps.syncAll).toHaveBeenCalledTimes(1));

    expect(screen.queryByText(/не удалось синхронизировать/i)).toBeNull();
  });
});
