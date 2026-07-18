// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { resetSyncForTesting } from "./__tests__/testing";
import { useSyncStore } from "./store";
import { useAppSync } from "./use-app-sync";
import type { AppSyncDeps } from "./use-app-sync";

const mockDb = {} as Parameters<AppSyncDeps["syncAll"]>[0];

function makeDeps(overrides?: Partial<AppSyncDeps>): AppSyncDeps {
  return {
    initDb: jest.fn().mockResolvedValue(mockDb),
    syncAll: jest.fn().mockResolvedValue("v1.0"),
    ...overrides,
  };
}

beforeEach(() => {
  resetSyncForTesting();
});

describe("useAppSync — first launch (isInitialSyncDone=false)", () => {
  test("starts with loading status and isFirstLaunch=true", () => {
    const { result } = renderHook(() => useAppSync(makeDeps()));
    expect(result.current.status).toBe("loading");
    expect(result.current.isFirstLaunch).toBe(true);
  });

  test("transitions to success and persists version + done flag", async () => {
    const { result } = renderHook(() => useAppSync(makeDeps()));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(useSyncStore.getState().isInitialSyncDone).toBe(true);
    expect(useSyncStore.getState().contentVersion).toBe("v1.0");
  });

  test("passes since=null to syncAll (no prior version)", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(deps.syncAll).toHaveBeenCalledWith(mockDb, null, expect.any(Function));
  });

  test("passes onProgress callback on first launch", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    const [, , onProgress] = (deps.syncAll as jest.Mock).mock.calls[0];
    expect(onProgress).toBeDefined();
  });

  test("updates progress state via onProgress callback", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockImplementation(async (_db, _since, onProgress) => {
        onProgress?.({ total: 5, completed: 3 });
        return "v1.0";
      }),
    });
    const progressValues: unknown[] = [];
    const { result } = renderHook(() => {
      const state = useAppSync(deps);
      progressValues.push(state.progress);
      return state;
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(progressValues).toContainEqual({ total: 5, completed: 3 });
  });

  test("transitions to error when sync fails on first launch", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(useSyncStore.getState().isInitialSyncDone).toBe(false);
  });

  test("retry re-runs sync after failure", async () => {
    const deps = makeDeps({
      syncAll: jest
        .fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce("v1.0"),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("error"));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(useSyncStore.getState().isInitialSyncDone).toBe(true);
  });

  test("transitions to error when initDb fails", async () => {
    const deps = makeDeps({
      initDb: jest.fn().mockRejectedValue(new Error("DB init")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  test("sets lastSyncedAt on successful sync", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });

  test("does not update contentVersion when syncAll returns null", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockResolvedValue(null),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(useSyncStore.getState().contentVersion).toBe("");
  });

  test("uses default deps when none are provided", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://test.example.com";
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          version: null,
          lesson_uuids: [],
          lessons: [],
          songs: [],
          chords: [],
          schemes: [],
          course_uuids: [],
          courses: [],
          course_lessons: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { result } = renderHook(() => useAppSync());
    await waitFor(() => expect(result.current.status).toBe("success"));

    jest.restoreAllMocks();
    delete process.env.EXPO_PUBLIC_API_URL;
  });
});

describe("useAppSync — returning user (isInitialSyncDone=true)", () => {
  beforeEach(() => {
    useSyncStore.setState({ isInitialSyncDone: true, contentVersion: "v0.9" });
  });

  test("isFirstLaunch is false", () => {
    const { result } = renderHook(() => useAppSync(makeDeps()));
    expect(result.current.isFirstLaunch).toBe(false);
  });

  test("passes contentVersion as since parameter", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(deps.syncAll).toHaveBeenCalledWith(mockDb, "v0.9", undefined);
  });

  test("does not pass onProgress on subsequent launch", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    const [, , onProgress] = (deps.syncAll as jest.Mock).mock.calls[0];
    expect(onProgress).toBeUndefined();
  });

  test("transitions to offline when sync fails (not error)", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("offline"));
  });

  test("isInitialSyncDone stays true after network failure", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("offline"));
    expect(useSyncStore.getState().isInitialSyncDone).toBe(true);
  });

  test("lastSyncedAt stays unset after a failed sync", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("offline"));
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });
});
