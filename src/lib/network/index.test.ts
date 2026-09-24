// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  ApiError,
  RequestTimeoutError,
  apiFetch,
  apiFetchStreaming,
  apiPostBinary,
  apiPostJson,
} from "./index";

const BASE_URL = "https://test.example.com";

const mockExpoFetch = jest.fn<Promise<Response>, [string, RequestInit]>();

jest.mock("expo/fetch", () => ({
  fetch: (url: string, init: RequestInit) => mockExpoFetch(url, init),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE_URL;
  jest.spyOn(globalThis, "fetch").mockReset();
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

describe("apiFetch", () => {
  test("throws when EXPO_PUBLIC_API_URL is not set", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    await expect(apiFetch("/any")).rejects.toThrow(
      "EXPO_PUBLIC_API_URL is not configured",
    );
  });

  test("fetches from base URL concatenated with path", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await apiFetch("/api/v1/test/");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/test/`,
      expect.anything(),
    );
  });

  test("returns parsed JSON on success", async () => {
    const payload = { id: 1, name: "test" };
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await apiFetch<typeof payload>("/any");
    expect(result).toEqual(payload);
  });

  test("throws on non-OK HTTP status", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    await expect(apiFetch("/any")).rejects.toThrow("HTTP error: 500");
  });

  test("includes the status code in the error message", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(apiFetch("/any")).rejects.toThrow("HTTP error: 404");
  });

  test("throws when response body is not valid JSON", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiFetch("/any")).rejects.toThrow("Failed to parse JSON response");
  });

  test("includes the path in the JSON parse error message", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("bad", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiFetch("/api/v1/broken/")).rejects.toThrow(
      "Failed to parse JSON response for /api/v1/broken/",
    );
  });
});

describe("request timeout", () => {
  function stallUntilAborted() {
    jest.spyOn(globalThis, "fetch").mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new TypeError("Aborted")),
          );
        }),
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("gives up on a server that never answers after 60 seconds", async () => {
    stallUntilAborted();
    const result = apiFetch("/api/v1/sync/lessons/").catch((err: unknown) => err);

    await jest.advanceTimersByTimeAsync(60_000);

    const error = await result;
    expect(error).toBeInstanceOf(RequestTimeoutError);
    expect((error as Error).message).toBe("Request timed out: /api/v1/sync/lessons/");
  });

  test("keeps waiting for a slow server short of the timeout", async () => {
    stallUntilAborted();
    const onSettled = jest.fn();
    void apiFetch("/any").then(onSettled, onSettled);

    await jest.advanceTimersByTimeAsync(59_000);

    expect(onSettled).not.toHaveBeenCalled();
  });

  test("applies the timeout to POST requests too", async () => {
    stallUntilAborted();
    const result = apiPostJson("/any", {}).catch((err: unknown) => err);

    await jest.advanceTimersByTimeAsync(60_000);

    expect(await result).toBeInstanceOf(RequestTimeoutError);
  });

  test("passes a network failure through unchanged", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Network request failed"));

    await expect(apiFetch("/any")).rejects.toThrow(
      new TypeError("Network request failed"),
    );
  });
});

describe("apiPostBinary", () => {
  test("sends POST with Content-Type application/json", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(new ArrayBuffer(4), { status: 200 }));
    await apiPostBinary("/api/v1/songs/uuid/print/", { show_text: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/songs/uuid/print/`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_text: true }),
      }),
    );
  });

  test("returns the body with the filename from Content-Disposition", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(new ArrayBuffer(8), {
        status: 200,
        headers: { "Content-Disposition": 'inline; filename="Zvyozdochka.pdf"' },
      }),
    );
    const result = await apiPostBinary("/api/v1/songs/uuid/print/", {});
    expect(result.data.byteLength).toBe(8);
    expect(result.filename).toBe("Zvyozdochka.pdf");
  });

  test("returns a null filename when Content-Disposition is missing", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(new ArrayBuffer(8), { status: 200 }));
    const result = await apiPostBinary("/api/v1/songs/uuid/print/", {});
    expect(result.filename).toBeNull();
  });

  test("throws on non-OK HTTP status", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 422 }));
    await expect(apiPostBinary("/any", {})).rejects.toThrow("HTTP error: 422");
  });

  test("throws when EXPO_PUBLIC_API_URL is not set", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    await expect(apiPostBinary("/any", {})).rejects.toThrow(
      "EXPO_PUBLIC_API_URL is not configured",
    );
  });
});

describe("apiPostJson", () => {
  test("sends POST with Content-Type application/json", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await apiPostJson("/api/v1/donations/verify/", { product_id: "donation_thanks" });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/donations/verify/`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: "donation_thanks" }),
      }),
    );
  });

  test("returns parsed JSON on success", async () => {
    const payload = { status: "verified" };
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await apiPostJson<typeof payload>("/any", {});
    expect(result).toEqual(payload);
  });

  test("throws an ApiError carrying the status code on a non-OK response", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 502 }));
    const error = await apiPostJson("/any", {}).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });

  test("uses the server's detail message when present", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unknown product_id." }), {
        status: 400,
      }),
    );
    await expect(apiPostJson("/any", {})).rejects.toThrow("Unknown product_id.");
  });

  test("falls back to a generic message when the error body isn't JSON", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("not-json", { status: 500 }));
    await expect(apiPostJson("/any", {})).rejects.toThrow("HTTP error: 500");
  });

  test("throws when response body is not valid JSON on success", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(apiPostJson("/any", {})).rejects.toThrow(
      "Failed to parse JSON response",
    );
  });

  test("throws when EXPO_PUBLIC_API_URL is not set", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    await expect(apiPostJson("/any", {})).rejects.toThrow(
      "EXPO_PUBLIC_API_URL is not configured",
    );
  });
});

describe("apiFetchStreaming", () => {
  const encoder = new TextEncoder();
  const RESPONSE_TIMEOUT_MS = 60_000;

  function streamedResponse(
    chunks: string[],
    init: { status?: number; delayMs?: number; signal?: AbortSignal } = {},
  ): Response {
    const { status = 200, delayMs = 0, signal } = init;
    const queue = chunks.map((chunk) => encoder.encode(chunk));
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        return new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            const next = queue.shift();
            if (next) controller.enqueue(next);
            else controller.close();
            resolve();
          }, delayMs);
          signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            controller.error(new TypeError("Aborted"));
            resolve();
          });
        });
      },
    });
    return new Response(body, { status });
  }

  function respondWith(chunks: string[], init?: { status?: number; delayMs?: number }) {
    mockExpoFetch.mockImplementation((_url, requestInit) =>
      Promise.resolve(
        streamedResponse(chunks, { ...init, signal: requestInit.signal ?? undefined }),
      ),
    );
  }

  beforeEach(() => {
    mockExpoFetch.mockReset();
  });

  test("parses a body that arrives in chunks", async () => {
    respondWith(['{"lessons":', "[1,2]}"]);

    const result = await apiFetchStreaming(
      "/api/v1/sync/lessons/",
      RESPONSE_TIMEOUT_MS,
    );

    expect(result).toEqual({ lessons: [1, 2] });
    expect(mockExpoFetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/sync/lessons/`,
      expect.anything(),
    );
  });

  test("decodes a character split across chunks", async () => {
    const bytes = encoder.encode('"урок"');
    mockExpoFetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(bytes.slice(0, 2));
            controller.enqueue(bytes.slice(2));
            controller.close();
          },
        }),
      ),
    );

    await expect(apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS)).resolves.toBe("урок");
  });

  test("throws an ApiError carrying the status code on a non-OK response", async () => {
    respondWith(['{"detail":"Bad since"}'], { status: 422 });

    const error = await apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS).catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, message: "Bad since" });
  });

  test("throws when the body is not valid JSON", async () => {
    respondWith(["not-json"]);

    await expect(apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS)).rejects.toThrow(
      "Failed to parse JSON response for /any",
    );
  });

  test("reports a failed connection as a TypeError, like the global fetch", async () => {
    mockExpoFetch.mockRejectedValueOnce(new Error("fetch failed: offline"));

    await expect(apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS)).rejects.toBeInstanceOf(
      TypeError,
    );
  });

  test("reports a connection dropped mid-body as a TypeError", async () => {
    mockExpoFetch.mockResolvedValueOnce(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode("[1,"));
            controller.error(new Error("connection lost"));
          },
        }),
      ),
    );

    await expect(apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS)).rejects.toBeInstanceOf(
      TypeError,
    );
  });

  describe("stall timeout", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("waits the full response timeout for a server that has not responded yet", async () => {
      mockExpoFetch.mockImplementation(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new TypeError("Aborted")),
            );
          }),
      );
      let settled = false;
      const result = apiFetchStreaming("/api/v1/sync/lessons/", RESPONSE_TIMEOUT_MS)
        .catch((err: unknown) => err)
        .finally(() => {
          settled = true;
        });

      await jest.advanceTimersByTimeAsync(RESPONSE_TIMEOUT_MS - 1);
      expect(settled).toBe(false);

      await jest.advanceTimersByTimeAsync(1);
      expect(await result).toEqual(new RequestTimeoutError("/api/v1/sync/lessons/"));
    });

    test("gives up when the body stops arriving for 30 seconds", async () => {
      respondWith(["[1,", "2]"], { delayMs: 40_000 });
      const result = apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS).catch(
        (err: unknown) => err,
      );

      await jest.advanceTimersByTimeAsync(30_000);

      expect(await result).toBeInstanceOf(RequestTimeoutError);
    });

    test("keeps a slow download alive while chunks keep arriving", async () => {
      respondWith(["[1,", "2,", "3]"], { delayMs: 25_000 });
      const result = apiFetchStreaming("/any", RESPONSE_TIMEOUT_MS);

      await jest.advanceTimersByTimeAsync(100_000);

      await expect(result).resolves.toEqual([1, 2, 3]);
    });
  });
});
