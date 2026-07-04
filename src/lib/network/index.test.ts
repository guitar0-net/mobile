// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { apiFetch, apiPostBinary } from "./index";

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

  test("returns ArrayBuffer on success", async () => {
    const buffer = new ArrayBuffer(8);
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(buffer, { status: 200 }));
    const result = await apiPostBinary("/api/v1/songs/uuid/print/", {});
    expect(result).toBeInstanceOf(ArrayBuffer);
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
