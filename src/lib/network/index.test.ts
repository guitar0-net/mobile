// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { components } from "./api.types";
import { getLessons, getLesson } from "./index";
import { queryClient, QUERY_DEFAULTS } from "./query-client";

type LessonsList = components["schemas"]["LessonsList"];
type LessonDetail = components["schemas"]["LessonDetail"];

const BASE_URL = "https://test.example.com";

const mockLesson: LessonsList = {
  uuid: "abc-123",
  title: "Open chords",
  video_url: "https://example.com/video.mp4",
  songs: [],
};

const mockLessonDetail: LessonDetail = {
  uuid: "abc-123",
  title: "Open chords",
  video_url: "https://example.com/video.mp4",
  songs: [],
  addition_lessons: [],
  course: null,
};

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE_URL;
  queryClient.setDefaultOptions({
    queries: { ...QUERY_DEFAULTS.queries, retryDelay: 0 },
  });
  queryClient.clear();
  jest.spyOn(globalThis, "fetch").mockReset();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getLessons
// ---------------------------------------------------------------------------

describe("getLessons", () => {
  test("throws when EXPO_PUBLIC_API_URL is not set", async () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    await expect(getLessons()).rejects.toThrow("EXPO_PUBLIC_API_URL is not configured");
  });

  test("returns the lessons array from a paginated API response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          count: 1,
          results: [mockLesson],
          next: null,
          previous: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const lessons = await getLessons();

    expect(lessons).toEqual([mockLesson]);
  });

  test("throws on a non-OK HTTP response", async () => {
    // mockResolvedValue (not Once) so all 3 attempts (1 + 2 retries) return 500
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 500 }));

    await expect(getLessons()).rejects.toThrow("HTTP error: 500");
  });

  test("throws when the response body is not valid JSON", async () => {
    // mockResolvedValue (not Once) so all 3 attempts (1 + 2 retries) return bad JSON
    jest.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getLessons()).rejects.toThrow("Failed to parse JSON response");
  });

  test("retries on a transient network error and returns the successful result", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("network failure"))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            count: 1,
            results: [mockLesson],
            next: null,
            previous: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const lessons = await getLessons();

    expect(lessons).toEqual([mockLesson]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("fetches from the lessons endpoint using the configured base URL", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ count: 0, results: [], next: null, previous: null }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await getLessons();

    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE_URL}/api/v1/lessons/`);
  });
});

// ---------------------------------------------------------------------------
// getLesson
// ---------------------------------------------------------------------------

describe("getLesson", () => {
  test("returns a fully typed LessonDetail object", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockLessonDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const lesson = await getLesson("abc-123");

    expect(lesson).toEqual(mockLessonDetail);
  });

  test("throws on a non-OK HTTP response", async () => {
    // mockResolvedValue (not Once) so all 3 attempts (1 + 2 retries) return 404
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(getLesson("abc-123")).rejects.toThrow("HTTP error: 404");
  });

  test("fetches from the lesson detail endpoint with the UUID in the path", async () => {
    const uuid = "dead-beef-0000";
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockLessonDetail), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getLesson(uuid);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/lessons/${uuid}/`,
    );
  });

  test("retries on a transient network error and returns the successful result", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("network failure"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify(mockLessonDetail), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const lesson = await getLesson("abc-123");

    expect(lesson).toEqual(mockLessonDetail);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  test("throws after all retries are exhausted", async () => {
    jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network failure"));

    await expect(getLesson("abc-123")).rejects.toThrow("network failure");
  });
});
