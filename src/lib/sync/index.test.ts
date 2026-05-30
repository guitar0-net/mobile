// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";

import { useSettingsStore } from "@/lib/settings/store";

import { resetSyncForTesting } from "./__tests__/testing";
import { useSyncState } from "./index";
import { readDefaults, useSyncStore } from "./store";

beforeEach(() => {
  resetSyncForTesting();
});

describe("useSyncState", () => {
  test("isInitialSyncDone defaults to false", () => {
    const { result } = renderHook(() => useSyncState());
    expect(result.current.isInitialSyncDone).toBe(false);
  });

  test("contentVersion defaults to empty string", () => {
    const { result } = renderHook(() => useSyncState());
    expect(result.current.contentVersion).toBe("");
  });

  test("setIsInitialSyncDone(true) persists the value", () => {
    const { result } = renderHook(() => useSyncState());

    act(() => {
      result.current.setIsInitialSyncDone(true);
    });

    expect(result.current.isInitialSyncDone).toBe(true);
  });

  test("setIsInitialSyncDone survives a store reset (MMKV roundtrip)", () => {
    const { result: writer } = renderHook(() => useSyncState());

    act(() => {
      writer.current.setIsInitialSyncDone(true);
    });

    // Simulate re-read from MMKV by re-initialising the store state from storage
    act(() => {
      useSyncStore.setState(readDefaults());
    });

    const { result: reader } = renderHook(() => useSyncState());
    expect(reader.current.isInitialSyncDone).toBe(true);
  });

  test("setContentVersion write-read roundtrip", () => {
    const { result } = renderHook(() => useSyncState());

    act(() => {
      result.current.setContentVersion("v2.1");
    });

    expect(result.current.contentVersion).toBe("v2.1");
  });

  test("useSyncState does not re-render when unrelated settings change", () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSyncState();
    });

    const before = renderCount;

    // Change a settings value that has nothing to do with sync
    act(() => {
      useSettingsStore.getState().setFontSize("xl");
    });

    // useSyncState must not have re-rendered
    expect(renderCount).toBe(before);
    // Sanity: the sync values are unchanged
    expect(result.current.isInitialSyncDone).toBe(false);
  });
});
