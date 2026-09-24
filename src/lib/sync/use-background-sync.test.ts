// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { resetSyncForTesting } from "./__tests__/testing";
import { useSyncStore } from "./store";
import { useBackgroundSync } from "./use-background-sync";

type NetworkListener = (event: { isInternetReachable?: boolean }) => void;

const mockNetworkListeners: NetworkListener[] = [];

jest.mock("expo-network", () => ({
  addNetworkStateListener: (listener: NetworkListener) => {
    mockNetworkListeners.push(listener);
    return { remove: () => mockNetworkListeners.splice(0) };
  },
}));

const runContentSync = jest.fn().mockResolvedValue(undefined);
const resumeSchemeImageSync = jest.fn().mockResolvedValue(undefined);
const deps = { runContentSync, resumeSchemeImageSync };
let appStateListeners: ((state: AppStateStatus) => void)[] = [];

function sendAppState(state: AppStateStatus) {
  appStateListeners.forEach((listener) => listener(state));
}

function sendNetwork(isInternetReachable: boolean) {
  mockNetworkListeners.forEach((listener) => listener({ isInternetReachable }));
}

beforeEach(() => {
  resetSyncForTesting();
  runContentSync.mockClear();
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

test("returning to the app after a failed sync retries the sync and resumes scheme images", () => {
  useSyncStore.setState({ syncStatus: "failed" });
  renderHook(() => useBackgroundSync(deps));

  sendAppState("background");
  expect(runContentSync).not.toHaveBeenCalled();
  sendAppState("active");

  expect(runContentSync).toHaveBeenCalledWith("foreground");
  expect(resumeSchemeImageSync).toHaveBeenCalledTimes(1);
});

test("reconnecting after a failed sync retries the sync", () => {
  useSyncStore.setState({ syncStatus: "failed" });
  renderHook(() => useBackgroundSync(deps));

  sendNetwork(false);
  expect(runContentSync).not.toHaveBeenCalled();
  sendNetwork(true);

  expect(runContentSync).toHaveBeenCalledWith("network");
  expect(resumeSchemeImageSync).toHaveBeenCalledTimes(1);
});

test("without a failed sync only scheme images are resumed", () => {
  renderHook(() => useBackgroundSync(deps));

  sendAppState("active");
  sendNetwork(true);

  expect(runContentSync).not.toHaveBeenCalled();
  expect(resumeSchemeImageSync).toHaveBeenCalledTimes(2);
});

test("stops listening once unmounted", () => {
  const { unmount } = renderHook(() => useBackgroundSync(deps));

  unmount();
  sendAppState("active");
  sendNetwork(true);

  expect(resumeSchemeImageSync).not.toHaveBeenCalled();
});
