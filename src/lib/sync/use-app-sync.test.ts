// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { ApiError, RequestTimeoutError } from "@/lib/network";

import { resetSyncForTesting } from "./__tests__/testing";
import { useSyncStore } from "./store";
import { useAppSync } from "./use-app-sync";
import type { AppSyncDeps } from "./use-app-sync";

const mockCapture = jest.fn();
const mockCaptureException = jest.fn();

jest.mock("@/lib/analytics", () => ({
  capture: (...args: unknown[]) => mockCapture(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const mockExpoFetch = jest.fn<Promise<Response>, [string, RequestInit]>();

jest.mock("expo/fetch", () => ({
  fetch: (url: string, init: RequestInit) => mockExpoFetch(url, init),
}));

const mockDb = {} as Parameters<AppSyncDeps["syncAll"]>[0];

function makeDeps(overrides?: Partial<AppSyncDeps>): AppSyncDeps {
  return {
    initDb: jest.fn().mockResolvedValue(mockDb),
    syncAll: jest.fn().mockResolvedValue("v1.0"),
    startSchemeImageSync: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  resetSyncForTesting();
  mockCapture.mockClear();
  mockCaptureException.mockClear();
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
        onProgress?.({ stage: "saving" });
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
    expect(progressValues).toContainEqual({ stage: "saving" });
  });

  test("renders the saving stage before the save starts", async () => {
    const rendered: unknown[] = [];
    let renderedWhenSaveStarts: unknown;
    const deps = makeDeps({
      syncAll: jest.fn().mockImplementation(async (_db, _since, onProgress) => {
        await onProgress?.({ stage: "saving" });
        renderedWhenSaveStarts = rendered.at(-1);
        return "v1.0";
      }),
    });
    const { result } = renderHook(() => {
      const state = useAppSync(deps);
      rendered.push(state.progress);
      return state;
    });
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(renderedWhenSaveStarts).toEqual({ stage: "saving" });
  });

  test("transitions to error when sync fails on first launch", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(useSyncStore.getState().isInitialSyncDone).toBe(false);
  });

  test("starts scheme image downloads once the first sync succeeds", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(deps.startSchemeImageSync).toHaveBeenCalledTimes(1);
  });

  test("does not start scheme image downloads when the first sync fails", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(deps.startSchemeImageSync).not.toHaveBeenCalled();
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
    mockExpoFetch.mockResolvedValue(
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
    expect(deps.syncAll).toHaveBeenCalledWith(mockDb, "v0.9", expect.any(Function));
  });

  test("does not show progress on subsequent launch", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockImplementation(async (_db, _since, onProgress) => {
        await onProgress?.({ stage: "saving" });
        return "v1.0";
      }),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.progress).toBeNull();
  });

  test("transitions to stale when sync fails (not error)", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("stale"));
  });

  test("isInitialSyncDone stays true after network failure", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("stale"));
    expect(useSyncStore.getState().isInitialSyncDone).toBe(true);
  });

  test("does not start scheme image downloads when a background sync fails", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("stale"));
    expect(deps.startSchemeImageSync).not.toHaveBeenCalled();
  });

  test("starts scheme image downloads after a successful background sync", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(deps.startSchemeImageSync).toHaveBeenCalledTimes(1);
  });

  test("lastSyncedAt stays unset after a failed sync", async () => {
    const deps = makeDeps({
      syncAll: jest.fn().mockRejectedValue(new Error("Network")),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.status).toBe("stale"));
    expect(useSyncStore.getState().lastSyncedAt).toBeNull();
  });
});

describe("useAppSync — failure classification", () => {
  beforeEach(() => {
    useSyncStore.setState({ isInitialSyncDone: true, contentVersion: "v0.9" });
  });

  async function failWith(error: unknown) {
    const deps = makeDeps({ syncAll: jest.fn().mockRejectedValue(error) });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
    return result;
  }

  test("reports a tripped rate limit as a busy server, not a lost connection", async () => {
    const result = await failWith(new ApiError(503));
    expect(result.current.failure?.kind).toBe("busy");
    expect(result.current.failure?.reason).toBe(
      "Слишком много запросов — попробуйте через минуту",
    );
  });

  test("reports 429 as busy", async () => {
    const result = await failWith(new ApiError(429));
    expect(result.current.failure?.kind).toBe("busy");
  });

  test("reports other 5xx as a server outage", async () => {
    const result = await failWith(new ApiError(502));
    expect(result.current.failure?.kind).toBe("server");
  });

  test("reports 4xx as a rejected request", async () => {
    const result = await failWith(new ApiError(422));
    expect(result.current.failure?.kind).toBe("rejected");
  });

  test("reports a fetch TypeError as offline", async () => {
    const result = await failWith(new TypeError("Network request failed"));
    expect(result.current.failure?.kind).toBe("offline");
    expect(result.current.failure?.reason).toBe("Проверьте подключение к интернету");
  });

  test("reports a request timeout as offline", async () => {
    const result = await failWith(new RequestTimeoutError("/api/v1/sync/lessons/"));
    expect(result.current.failure?.kind).toBe("offline");
  });

  test("does not blame the network for a local failure", async () => {
    const deps = makeDeps({ initDb: jest.fn().mockRejectedValue(new Error("DB")) });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
    expect(result.current.failure?.kind).toBe("unknown");
  });

  test("clears the failure once a retry succeeds", async () => {
    const deps = makeDeps({
      syncAll: jest
        .fn()
        .mockRejectedValueOnce(new ApiError(503))
        .mockResolvedValueOnce("v1.0"),
    });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.failure).not.toBeNull());

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.failure).toBeNull();
  });
});

describe("useAppSync — error reporting", () => {
  async function failWith(error: unknown) {
    const deps = makeDeps({ syncAll: jest.fn().mockRejectedValue(error) });
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
  }

  test("reports every first-launch failure with its classification", async () => {
    const error = new TypeError("Network request failed");
    await failWith(error);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      stage: "content_sync",
      kind: "offline",
      is_first_launch: true,
      error_name: "TypeError",
      duration_ms: expect.any(Number),
      sync_step: "fetching",
    });
  });

  test("reports an unexpected background failure", async () => {
    useSyncStore.setState({ isInitialSyncDone: true, contentVersion: "v0.9" });
    const error = new Error("Unable to download file");
    await failWith(error);
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      stage: "content_sync",
      kind: "unknown",
      is_first_launch: false,
      error_name: "Error",
      duration_ms: expect.any(Number),
      sync_step: "fetching",
    });
  });

  test("stays quiet about a background sync that failed for lack of network", async () => {
    useSyncStore.setState({ isInitialSyncDone: true, contentVersion: "v0.9" });
    await failWith(new TypeError("Network request failed"));
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});

describe("useAppSync — failure analytics", () => {
  function syncFailedProps(): Record<string, unknown> {
    const call = mockCapture.mock.calls.find(
      ([event]) => event === "content_sync_failed",
    );
    return call?.[1];
  }

  async function runFailing(deps: AppSyncDeps) {
    const { result } = renderHook(() => useAppSync(deps));
    await waitFor(() => expect(result.current.failure).not.toBeNull());
  }

  test("tells a timeout apart from an unreachable server in background syncs", async () => {
    useSyncStore.setState({ isInitialSyncDone: true, contentVersion: "v0.9" });
    await runFailing(
      makeDeps({
        syncAll: jest
          .fn()
          .mockRejectedValue(new RequestTimeoutError("/api/v1/sync/lessons/")),
      }),
    );
    expect(syncFailedProps()).toMatchObject({
      kind: "offline",
      error_name: "RequestTimeoutError",
      sync_step: "fetching",
    });
  });

  test("attributes a failure after the download to saving", async () => {
    await runFailing(
      makeDeps({
        syncAll: jest.fn().mockImplementation(async (_db, _since, onProgress) => {
          await onProgress?.({ stage: "saving" });
          throw new Error("FOREIGN KEY constraint failed");
        }),
      }),
    );
    expect(syncFailedProps()).toMatchObject({ sync_step: "saving" });
  });

  test("attributes a database failure to initialization, not the network", async () => {
    await runFailing(
      makeDeps({ initDb: jest.fn().mockRejectedValue(new Error("DB")) }),
    );
    expect(syncFailedProps()).toMatchObject({ kind: "unknown", sync_step: "init" });
  });
});
