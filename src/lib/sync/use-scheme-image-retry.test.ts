// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { resetSyncForTesting } from "./__tests__/testing";
import { useSyncStore } from "./store";
import { useSchemeImageRetry } from "./use-scheme-image-retry";

type NetworkListener = (event: { isInternetReachable?: boolean }) => void;

const mockNetworkListeners: NetworkListener[] = [];

jest.mock("expo-network", () => ({
  addNetworkStateListener: (listener: NetworkListener) => {
    mockNetworkListeners.push(listener);
    return { remove: () => mockNetworkListeners.splice(0) };
  },
}));

const resumeSchemeImageSync = jest.fn().mockResolvedValue(undefined);
let appStateListeners: ((state: AppStateStatus) => void)[] = [];

function sendAppState(state: AppStateStatus) {
  appStateListeners.forEach((listener) => listener(state));
}

function sendNetwork(isInternetReachable: boolean) {
  mockNetworkListeners.forEach((listener) => listener({ isInternetReachable }));
}

beforeEach(() => {
  resetSyncForTesting();
  useSyncStore.getState().setIsInitialSyncDone(true);
  resumeSchemeImageSync.mockClear();
  mockNetworkListeners.splice(0);
  appStateListeners = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _type: string,
    listener: (state: AppStateStatus) => void,
  ) => {
    appStateListeners.push(listener);
    return { remove: () => (appStateListeners = []) };
  }) as typeof AppState.addEventListener);
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("resumes scheme images when the app returns to the foreground", () => {
  renderHook(() => useSchemeImageRetry({ resumeSchemeImageSync }));

  sendAppState("background");
  expect(resumeSchemeImageSync).not.toHaveBeenCalled();
  sendAppState("active");
  expect(resumeSchemeImageSync).toHaveBeenCalledTimes(1);
});

test("resumes scheme images when the internet becomes reachable", () => {
  renderHook(() => useSchemeImageRetry({ resumeSchemeImageSync }));

  sendNetwork(false);
  expect(resumeSchemeImageSync).not.toHaveBeenCalled();
  sendNetwork(true);
  expect(resumeSchemeImageSync).toHaveBeenCalledTimes(1);
});

test("waits for the first sync before downloading anything", () => {
  useSyncStore.getState().setIsInitialSyncDone(false);
  renderHook(() => useSchemeImageRetry({ resumeSchemeImageSync }));

  sendAppState("active");
  sendNetwork(true);

  expect(resumeSchemeImageSync).not.toHaveBeenCalled();
});

test("stops listening once unmounted", () => {
  const { unmount } = renderHook(() => useSchemeImageRetry({ resumeSchemeImageSync }));

  unmount();
  sendAppState("active");
  sendNetwork(true);

  expect(resumeSchemeImageSync).not.toHaveBeenCalled();
});
