// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as FileSystem from "expo-file-system";

import type { PrintSettingsData } from "./print-settings-store";
import { printSong } from "./print-song";

const BASE_URL = "https://test.example.com";

const mockWrite = jest.fn();
const mockDelete = jest.fn();
const mockShareAsync = jest.fn();

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({
    uri: "mock-file://song.pdf",
    write: mockWrite,
    delete: mockDelete,
  })),
  Paths: { cache: "mock-cache-dir" },
}));

jest.mock("expo-sharing", () => ({
  shareAsync: (...args: unknown[]) => mockShareAsync(...args),
}));

const params: PrintSettingsData = {
  showChords: true,
  showSchemes: false,
  showText: true,
  chordOrientation: "horizontal",
  chordSize: 4,
  schemeSize: 2,
  textSize: 3,
  columnsCount: 2,
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE_URL;
  jest.spyOn(globalThis, "fetch").mockReset();
  mockWrite.mockReset();
  mockDelete.mockReset();
  mockShareAsync.mockReset();
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

test("posts print settings mapped to snake_case and shares the resulting PDF", async () => {
  const buffer = new ArrayBuffer(4);
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(buffer, { status: 200 }));
  mockShareAsync.mockResolvedValueOnce(undefined);

  await printSong("song-uuid", params);

  expect(globalThis.fetch).toHaveBeenCalledWith(
    `${BASE_URL}/api/v1/songs/song-uuid/print/`,
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        show_chords: true,
        show_schemes: false,
        show_text: true,
        chord_orientation: "horizontal",
        chord_size: 4,
        scheme_size: 2,
        text_size: 3,
        columns_count: 2,
      }),
    }),
  );
  expect(FileSystem.File).toHaveBeenCalledWith(
    FileSystem.Paths.cache,
    "song-song-uuid.pdf",
  );
  expect(mockWrite).toHaveBeenCalledWith(new Uint8Array(buffer));
  expect(mockShareAsync).toHaveBeenCalledWith("mock-file://song.pdf", {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });
  expect(mockDelete).toHaveBeenCalled();
});

test("deletes the temp file even when sharing fails", async () => {
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));
  mockShareAsync.mockRejectedValueOnce(new Error("cancelled"));

  await expect(printSong("song-uuid", params)).rejects.toThrow("cancelled");

  expect(mockDelete).toHaveBeenCalled();
});
