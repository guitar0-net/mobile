// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ApiError, apiFetch, apiPostBinary, apiPostJson } from "./index";

const BASE_URL = "https://test.example.com";

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
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/test/`);
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
