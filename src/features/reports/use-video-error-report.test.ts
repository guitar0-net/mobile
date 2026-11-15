// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { _resetDbForTesting, initDb } from "@/lib/db";

import { flushPendingReports } from "./queue";
import { storage } from "./storage";
import { useVideoErrorReport } from "./use-video-error-report";

const mockNetworkState = {
  isInternetReachable: true as boolean | undefined,
  type: "WIFI" as string | undefined,
};
jest.mock("expo-network", () => ({
  useNetworkState: () => mockNetworkState,
}));
jest.mock("@/lib/analytics", () => ({ capture: jest.fn() }));

const LESSON_ID = "6236a799-32b4-4e98-b9b2-9ade9ba83b47";

function sentBodies(): Record<string, unknown>[] {
  return jest
    .mocked(globalThis.fetch)
    .mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
}

beforeEach(async () => {
  storage.clearAll();
  _resetDbForTesting();
  await initDb();
  mockNetworkState.isInternetReachable = true;
  mockNetworkState.type = "WIFI";
  process.env.EXPO_PUBLIC_API_URL = "https://test.example.com";
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response("{}", { status: 201 }));
});

afterEach(async () => {
  await flushPendingReports();
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

test("a stream that failed without internet is not reportable", () => {
  mockNetworkState.isInternetReachable = false;

  const { result } = renderHook(() => useVideoErrorReport(LESSON_ID, "stream"));

  expect(result.current).toMatchObject({ isOffline: true, canReport: false });
});

test.each(["stream", "offline"] as const)(
  "a %s video that failed with internet is reportable",
  (source) => {
    const { result } = renderHook(() => useVideoErrorReport(LESSON_ID, source));

    expect(result.current).toMatchObject({ isOffline: false, canReport: true });
  },
);

test("a downloaded video is reportable even without internet", () => {
  mockNetworkState.isInternetReachable = false;

  const { result } = renderHook(() => useVideoErrorReport(LESSON_ID, "offline"));

  expect(result.current.canReport).toBe(true);
});

test("sending reports the lesson's media as broken with the playback details", async () => {
  const { result } = renderHook(() => useVideoErrorReport(LESSON_ID, "stream"));

  act(() => result.current.send("Source error: 403"));

  expect(result.current.sent).toBe(true);
  await waitFor(() =>
    expect(sentBodies()).toEqual([
      expect.objectContaining({
        target_type: "lesson",
        target_id: LESSON_ID,
        reason: "broken_media",
        message: "source: stream; network: WIFI; error: Source error: 403",
        screen: "/video/[id]",
      }),
    ]),
  );
});

test("a report sent before the network state arrives names the network unknown", async () => {
  mockNetworkState.type = undefined;
  const { result } = renderHook(() => useVideoErrorReport(LESSON_ID, "offline"));

  act(() => result.current.send("Decoder error"));

  await waitFor(() =>
    expect(sentBodies()).toEqual([
      expect.objectContaining({
        message: "source: offline; network: unknown; error: Decoder error",
      }),
    ]),
  );
});
