// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { components } from "@/lib/network/api.types";

import { getAnnouncement, getAnnouncements } from "./api";

type AnnouncementsList = components["schemas"]["AnnouncementsList"];
type AnnouncementDetail = components["schemas"]["AnnouncementDetail"];

const BASE_URL = "https://test.example.com";

const mockItem: AnnouncementsList = {
  uuid: "ann-1",
  title: "New feature",
  slug: "new-feature",
  content: "We added something cool.",
};

const mockDetail: AnnouncementDetail = {
  uuid: "ann-1",
  title: "New feature",
  slug: "new-feature",
  content: "We added something cool.",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE_URL;
  jest.spyOn(globalThis, "fetch").mockReset();
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getAnnouncements
// ---------------------------------------------------------------------------

describe("getAnnouncements", () => {
  test("fetches with limit and offset in the query string", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ count: 1, results: [mockItem], next: null, previous: null }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await getAnnouncements(10, 0);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/announcements/?limit=10&offset=0`,
      expect.anything(),
    );
  });

  test("encodes independent limit and offset values correctly", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ count: 0, results: [], next: null, previous: null }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await getAnnouncements(5, 20);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/announcements/?limit=5&offset=20`,
      expect.anything(),
    );
  });

  test("returns the full paginated response", async () => {
    const payload = { count: 1, results: [mockItem], next: null, previous: null };
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getAnnouncements(10, 0);

    expect(result).toEqual(payload);
  });

  test("throws on non-OK HTTP response", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(getAnnouncements(10, 0)).rejects.toThrow("HTTP error: 500");
  });
});

// ---------------------------------------------------------------------------
// getAnnouncement
// ---------------------------------------------------------------------------

describe("getAnnouncement", () => {
  test("fetches from the detail endpoint with the UUID in the path", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getAnnouncement("ann-1");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/announcements/ann-1/`,
      expect.anything(),
    );
  });

  test("returns the announcement detail", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await getAnnouncement("ann-1");

    expect(result).toEqual(mockDetail);
  });

  test("throws on non-OK HTTP response", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(getAnnouncement("ann-1")).rejects.toThrow("HTTP error: 404");
  });
});
