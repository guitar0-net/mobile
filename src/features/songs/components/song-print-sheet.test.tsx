// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { resetPrintSettingsForTesting } from "../__tests__/testing";
import { usePrintSettingsStore } from "../print-settings-store";
import { SongPrintSheet } from "./song-print-sheet";

jest.mock("../print-song", () => ({
  printSong: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock() runs before import; require() is the only way to get the typed mock reference after mocking
const { printSong } = require("../print-song") as { printSong: jest.Mock };

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
}

const DEFAULT_PROPS = {
  visible: true,
  onClose: jest.fn(),
  songUuid: "song-abc",
  hasChords: true,
  hasSchemes: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  resetPrintSettingsForTesting();
});

describe("SongPrintSheet", () => {
  test("renders the sheet title", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });
    expect(screen.getByText("Печать")).toBeTruthy();
  });

  test("shows 'Нет аккордов' when hasChords is false", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} hasChords={false} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("Нет аккордов")).toBeTruthy();
  });

  test("shows 'Нет схем' when hasSchemes is false", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} hasSchemes={false} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("Нет схем")).toBeTruthy();
  });

  test("hides chord size controls when hasChords is false", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} hasChords={false} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.queryByText("Вертикальная")).toBeNull();
    expect(screen.queryByText("Горизонтальная")).toBeNull();
  });

  test("hides scheme size control when hasSchemes is false", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} hasSchemes={false} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.getByText("Нет схем")).toBeTruthy();
    // Only chord + text sections render a size SegmentedControl when schemes are absent.
    const sizeButtons = screen.getAllByText("80%");
    expect(sizeButtons).toHaveLength(2);
  });

  test("hides text size control when showText is toggled off", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });
    const switches = screen.getAllByRole("switch");
    // Third switch is showText (index 2: showChords, showSchemes, showText)
    fireEvent(switches[2], "valueChange", false);
    expect(usePrintSettingsStore.getState().showText).toBe(false);
  });

  test("calls printSong with songUuid and current settings on button press", async () => {
    printSong.mockResolvedValue(undefined);
    render(<SongPrintSheet {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });
    fireEvent.press(screen.getByText("Получить PDF"));
    await waitFor(() =>
      expect(printSong).toHaveBeenCalledWith(
        "song-abc",
        expect.objectContaining({
          showChords: true,
          showSchemes: true,
          showText: true,
          chordOrientation: "vertical",
          chordSize: 3,
          schemeSize: 3,
          textSize: 3,
          columnsCount: 1,
        }),
      ),
    );
  });

  test("shows loading label while PDF is being generated", async () => {
    let resolvePromise: () => void;
    printSong.mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePromise = resolve;
      }),
    );
    render(<SongPrintSheet {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });
    fireEvent.press(screen.getByText("Получить PDF"));
    await waitFor(() => expect(screen.getByText("Генерация PDF...")).toBeTruthy());
    resolvePromise!();
  });

  test("shows error message when printSong fails", async () => {
    printSong.mockRejectedValue(new Error("Network request failed"));
    render(<SongPrintSheet {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });
    fireEvent.press(screen.getByText("Получить PDF"));
    await waitFor(() =>
      expect(screen.getByText("Не удалось создать PDF.")).toBeTruthy(),
    );
  });

  test("columns segmented control is always visible", () => {
    render(<SongPrintSheet {...DEFAULT_PROPS} />, { wrapper: makeWrapper() });
    expect(screen.getByText("Колонок на странице")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
  });
});
