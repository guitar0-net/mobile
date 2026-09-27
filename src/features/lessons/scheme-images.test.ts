// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { eq } from "drizzle-orm";

import { initDb, schemes, songSchemes, songs } from "@/lib/db";

import { resetDbForTesting } from "./__tests__/testing";
import { deleteAllSchemeImages, useSchemeImage } from "./scheme-images";

type DownloadOptions = { signal: AbortSignal; onProgress: () => void };
type MockDownload = (
  url: string,
  dest: { uri: string },
  options: DownloadOptions,
) => Promise<void>;

const mockFiles = new Map<string, string>();
const mockDownload = jest.fn<ReturnType<MockDownload>, Parameters<MockDownload>>();

const BUNDLED_BEAT1 = 101;

jest.mock("./bundled-schemes", () => ({
  BUNDLED_SCHEME_IMAGES: { "/media/lesson_schemes/beat1.jpg": BUNDLED_BEAT1 },
}));

jest.mock("@/lib/analytics", () => ({
  capture: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock("expo-file-system", () => {
  const join = (parts: (string | { uri: string })[]) =>
    parts.map((part) => (typeof part === "string" ? part : part.uri)).join("/");

  class MockDirectory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    get exists() {
      return true;
    }
    create() {}
    list() {
      return [...mockFiles.keys()]
        .filter((file) => file.startsWith(`${this.uri}/`))
        .map((file) => new MockFile(file));
    }
    delete() {
      for (const file of [...mockFiles.keys()]) {
        if (file.startsWith(`${this.uri}/`)) mockFiles.delete(file);
      }
    }
  }

  class MockFile {
    static downloadFileAsync = (
      url: string,
      dest: { uri: string },
      options: DownloadOptions,
    ) => mockDownload(url, dest, options);
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(parts);
    }
    get name() {
      return this.uri.split("/").pop();
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
    moveSync(dest: { uri: string }) {
      mockFiles.set(dest.uri, mockFiles.get(this.uri) ?? "");
      mockFiles.delete(this.uri);
    }
  }

  return {
    Paths: { document: "file:///docs" },
    Directory: MockDirectory,
    File: MockFile,
  };
});

const IMAGES = "file:///docs/images";

function writesFile(url: string, dest: { uri: string }) {
  mockFiles.set(dest.uri, url);
  return Promise.resolve();
}

async function seedSchemes(entries: { id: number; localImagePath?: string }[]) {
  const db = await initDb();
  await db.insert(songs).values({ uuid: "song", title: "Song", text: "" });
  for (const { id, localImagePath } of entries) {
    await db.insert(schemes).values({
      id,
      image: `/media/lesson_schemes/beat${id}.jpg`,
      localImagePath: localImagePath ?? null,
    });
    await db.insert(songSchemes).values({ songUuid: "song", schemeId: id });
  }
  return db;
}

function storedFileNames(db: Awaited<ReturnType<typeof initDb>>) {
  return db
    .select({ id: schemes.id, fileName: schemes.localImagePath })
    .from(schemes)
    .orderBy(schemes.id)
    .all();
}

beforeEach(() => {
  resetDbForTesting();
  deleteAllSchemeImages();
  mockFiles.clear();
  mockDownload.mockReset();
  mockDownload.mockImplementation(writesFile);
  process.env.EXPO_PUBLIC_API_URL = "https://api.test";
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe("useSchemeImage", () => {
  const scheme = (id: number, localImagePath: string | null = null) => ({
    id,
    image: `/media/lesson_schemes/beat${id}.jpg`,
    localImagePath,
  });
  const readyFile = (name: string) => ({
    state: "ready",
    source: { uri: `${IMAGES}/${name}` },
  });

  test("shows the downloaded file when it is on disk", async () => {
    await seedSchemes([{ id: 7, localImagePath: "7.jpg" }]);
    mockFiles.set(`${IMAGES}/7.jpg`, "");

    const { result } = renderHook(() => useSchemeImage(scheme(7, "7.jpg")));

    expect(result.current).toEqual(readyFile("7.jpg"));
    expect(mockDownload).not.toHaveBeenCalled();
  });

  test("shows the bundled image without downloading it", async () => {
    await seedSchemes([{ id: 1 }]);

    const { result } = renderHook(() => useSchemeImage(scheme(1)));

    expect(result.current).toEqual({ state: "ready", source: BUNDLED_BEAT1 });
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    expect(mockDownload).not.toHaveBeenCalled();
  });

  test("prefers the bundled image over a file downloaded earlier", async () => {
    await seedSchemes([{ id: 1, localImagePath: "1.jpg" }]);
    mockFiles.set(`${IMAGES}/1.jpg`, "");

    const { result } = renderHook(() => useSchemeImage(scheme(1, "1.jpg")));

    expect(result.current).toEqual({ state: "ready", source: BUNDLED_BEAT1 });
  });

  test("downloads the image when its path is no longer the bundled one", async () => {
    const db = await seedSchemes([{ id: 1 }]);
    const image = "/media/lesson_schemes/beat1_abc123.jpg";
    db.update(schemes).set({ image }).where(eq(schemes.id, 1)).run();

    const { result } = renderHook(() =>
      useSchemeImage({ id: 1, image, localImagePath: null }),
    );

    expect(result.current).toEqual({ state: "loading" });
    await waitFor(() => expect(result.current).toEqual(readyFile("1.jpg")));
    expect(mockDownload.mock.calls[0][0]).toBe(
      "https://api.test/media/lesson_schemes/beat1_abc123.jpg",
    );
  });

  test("is loading until the download is saved, then shows the file", async () => {
    await seedSchemes([{ id: 7 }]);
    let finish = () => {};
    mockDownload.mockImplementationOnce(
      (url, dest) =>
        new Promise((resolve) => {
          finish = () => void writesFile(url, dest).then(resolve);
        }),
    );

    const { result } = renderHook(() => useSchemeImage(scheme(7)));

    expect(result.current).toEqual({ state: "loading" });
    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
    finish();
    await waitFor(() => expect(result.current).toEqual(readyFile("7.jpg")));
  });

  test("downloads a file that went missing instead of using the server URL", async () => {
    await seedSchemes([{ id: 7, localImagePath: "7.jpg" }]);

    const { result } = renderHook(() => useSchemeImage(scheme(7, "7.jpg")));

    expect(result.current).toEqual({ state: "loading" });
    await waitFor(() => expect(result.current).toEqual(readyFile("7.jpg")));
  });

  test("does not download again when the screen reopens with stale props", async () => {
    await seedSchemes([{ id: 7 }]);
    const first = renderHook(() => useSchemeImage(scheme(7)));
    await waitFor(() => expect(first.result.current.state).toBe("ready"));
    first.unmount();

    const { result } = renderHook(() => useSchemeImage(scheme(7)));

    expect(result.current).toEqual(readyFile("7.jpg"));
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  test("a failed download reports failure and does not retry by itself", async () => {
    await seedSchemes([{ id: 7 }]);
    mockDownload.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useSchemeImage(scheme(7)));

    await waitFor(() => expect(result.current.state).toBe("failed"));
    await new Promise<void>((resolve) => setImmediate(() => resolve()));
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  test("a failed download leaves neither a partial file nor a recorded path", async () => {
    const db = await seedSchemes([{ id: 7 }]);
    mockDownload.mockImplementation((_url, dest) => {
      mockFiles.set(dest.uri, "");
      return Promise.reject(new Error("UnableToDownload: 503"));
    });

    const { result } = renderHook(() => useSchemeImage(scheme(7)));

    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(mockFiles.size).toBe(0);
    expect(storedFileNames(db)).toEqual([{ id: 7, fileName: null }]);
  });

  test("drops the file when the scheme image changed while it was downloading", async () => {
    const db = await seedSchemes([{ id: 7 }]);

    const { result } = renderHook(() =>
      useSchemeImage({
        id: 7,
        image: "/media/lesson_schemes/old7.jpg",
        localImagePath: null,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("failed"));
    expect(mockFiles.size).toBe(0);
    expect(storedFileNames(db)).toEqual([{ id: 7, fileName: null }]);
  });

  test("fails a download that receives no data for 20 seconds", async () => {
    await seedSchemes([{ id: 7 }]);
    jest.useFakeTimers();
    mockDownload.mockImplementation(
      (_url, _dest, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new Error("AbortError")),
          );
        }),
    );

    const { result } = renderHook(() => useSchemeImage(scheme(7)));
    await act(() => jest.advanceTimersByTimeAsync(20_000));
    jest.useRealTimers();

    expect(result.current.state).toBe("failed");
  });

  test("keeps a slow download alive while data keeps arriving", async () => {
    await seedSchemes([{ id: 7 }]);
    jest.useFakeTimers();
    mockDownload.mockImplementation(
      (url, dest, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new Error("AbortError")),
          );
          const chunks = setInterval(options.onProgress, 15_000);
          setTimeout(() => {
            clearInterval(chunks);
            void writesFile(url, dest).then(resolve);
          }, 50_000);
        }),
    );

    const { result } = renderHook(() => useSchemeImage(scheme(7)));
    await act(() => jest.advanceTimersByTimeAsync(50_000));
    jest.useRealTimers();

    expect(result.current).toEqual(readyFile("7.jpg"));
  });

  test("retry downloads the image again", async () => {
    await seedSchemes([{ id: 7 }]);
    mockDownload.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSchemeImage(scheme(7)));
    await waitFor(() => expect(result.current.state).toBe("failed"));

    act(() => {
      if (result.current.state === "failed") result.current.retry();
    });

    expect(result.current).toEqual({ state: "loading" });
    await waitFor(() => expect(result.current).toEqual(readyFile("7.jpg")));
    expect(mockDownload).toHaveBeenCalledTimes(2);
  });
});
