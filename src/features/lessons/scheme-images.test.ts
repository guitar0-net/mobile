// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";
import { eq } from "drizzle-orm";

import { initDb, schemes, songSchemes, songs } from "@/lib/db";
import { RequestTimeoutError } from "@/lib/network";

import { resetDbForTesting } from "./__tests__/testing";
import {
  deleteAllSchemeImages,
  resumeSchemeImageSync,
  startSchemeImageSync,
  useSchemeImage,
  useSchemeImageStatus,
} from "./scheme-images";

type DownloadOptions = { signal: AbortSignal; onProgress: () => void };
type MockDownload = (
  url: string,
  dest: { uri: string },
  options: DownloadOptions,
) => Promise<void>;

const mockFiles = new Map<string, string>();
const mockDownload = jest.fn<ReturnType<MockDownload>, Parameters<MockDownload>>();
const mockCapture = jest.fn();

const BUNDLED_BEAT1 = 101;

jest.mock("./bundled-schemes", () => ({
  BUNDLED_SCHEME_IMAGES: { "/media/lesson_schemes/beat1.jpg": BUNDLED_BEAT1 },
}));

jest.mock("@/lib/analytics", () => ({
  capture: (...args: unknown[]) => mockCapture(...args),
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
  mockCapture.mockClear();
  process.env.EXPO_PUBLIC_API_URL = "https://api.test";
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
});

describe("startSchemeImageSync", () => {
  test("downloads every missing image and records each file name", async () => {
    const db = await seedSchemes([{ id: 1 }, { id: 2 }, { id: 3 }]);

    await startSchemeImageSync();

    expect(storedFileNames(db)).toEqual([
      { id: 1, fileName: "1.jpg" },
      { id: 2, fileName: "2.jpg" },
      { id: 3, fileName: "3.jpg" },
    ]);
    expect([...mockFiles.keys()].sort()).toEqual([
      `${IMAGES}/1.jpg`,
      `${IMAGES}/2.jpg`,
      `${IMAGES}/3.jpg`,
    ]);
    expect(mockDownload).toHaveBeenCalledWith(
      "https://api.test/media/lesson_schemes/beat1.jpg",
      expect.anything(),
      expect.anything(),
    );
    expect(mockCapture).toHaveBeenCalledWith(
      "scheme_images_drained",
      expect.objectContaining({ downloaded: 3 }),
    );
  });

  test("skips images that are already on disk", async () => {
    mockFiles.set(`${IMAGES}/1.png`, "");
    await seedSchemes([{ id: 1, localImagePath: "1.png" }, { id: 2 }]);

    await startSchemeImageSync();

    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockDownload.mock.calls[0][0]).toContain("beat2.jpg");
  });

  test("downloads again an image whose recorded file is gone from disk", async () => {
    const db = await seedSchemes([{ id: 1, localImagePath: "1.png" }]);

    await startSchemeImageSync();

    expect(storedFileNames(db)).toEqual([{ id: 1, fileName: "1.jpg" }]);
  });

  test("deletes files that no scheme points to", async () => {
    mockFiles.set(`${IMAGES}/1.jpg`, "");
    mockFiles.set(`${IMAGES}/99.jpg`, "");
    mockFiles.set(`${IMAGES}/.tmp-4-2.jpg`, "");
    await seedSchemes([{ id: 1, localImagePath: "1.jpg" }]);

    await startSchemeImageSync();

    expect([...mockFiles.keys()]).toEqual([`${IMAGES}/1.jpg`]);
  });

  test("keeps the temporary file of a download that is still running", async () => {
    await seedSchemes([{ id: 7 }]);
    let finish = () => {};
    mockDownload.mockImplementationOnce((url, dest) => {
      mockFiles.set(dest.uri, "");
      return new Promise((resolve) => {
        finish = () => void writesFile(url, dest).then(resolve);
      });
    });
    renderHook(() =>
      useSchemeImage({
        id: 7,
        image: "/media/lesson_schemes/beat7.jpg",
        localImagePath: null,
      }),
    );
    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
    const [tmpFile] = mockFiles.keys();

    const pass = startSchemeImageSync();

    expect(mockFiles.has(tmpFile)).toBe(true);
    finish();
    await pass;
    expect([...mockFiles.keys()]).toEqual([`${IMAGES}/7.jpg`]);
  });

  test("ignores schemes that no song uses", async () => {
    const db = await seedSchemes([{ id: 1 }]);
    await db.insert(schemes).values({ id: 9, image: "/media/orphan.jpg" });

    await startSchemeImageSync();

    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  test("a failed download leaves neither a partial file nor a recorded path", async () => {
    const db = await seedSchemes([{ id: 1 }]);
    mockDownload.mockImplementation((_url, dest) => {
      mockFiles.set(dest.uri, "");
      return Promise.reject(new Error("UnableToDownload: 503"));
    });

    await startSchemeImageSync();

    expect(mockFiles.size).toBe(0);
    expect(storedFileNames(db)).toEqual([{ id: 1, fileName: null }]);
    expect(mockCapture).toHaveBeenCalledWith("scheme_images_sweep_failed", {
      error_name: "Error",
      error_message: "UnableToDownload: 503",
      pending: 1,
      downloaded: 0,
    });
  });

  test("gives up after five failures in a row instead of trying every image", async () => {
    await seedSchemes(Array.from({ length: 20 }, (_, i) => ({ id: i + 1 })));
    mockDownload.mockRejectedValue(new Error("UnableToDownload: 503"));

    await startSchemeImageSync();

    expect(mockDownload.mock.calls.length).toBeGreaterThanOrEqual(5);
    expect(mockDownload.mock.calls.length).toBeLessThanOrEqual(6);
  });

  test("a success resets the failure streak", async () => {
    const db = await seedSchemes(Array.from({ length: 10 }, (_, i) => ({ id: i + 1 })));
    mockDownload.mockImplementation((url, dest) =>
      url.endsWith("beat5.jpg") || url.endsWith("beat10.jpg")
        ? writesFile(url, dest)
        : Promise.reject(new Error("flaky")),
    );

    await startSchemeImageSync();

    expect(mockDownload).toHaveBeenCalledTimes(10);
    expect(storedFileNames(db).filter(({ fileName }) => fileName)).toHaveLength(2);
  });

  test("keeps at most two downloads in flight", async () => {
    await seedSchemes(Array.from({ length: 6 }, (_, i) => ({ id: i + 1 })));
    let inFlight = 0;
    let maxInFlight = 0;
    mockDownload.mockImplementation(async (url, dest) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise<void>((resolve) => setImmediate(() => resolve()));
      inFlight -= 1;
      await writesFile(url, dest);
    });

    await startSchemeImageSync();

    expect(maxInFlight).toBe(2);
    expect(mockDownload).toHaveBeenCalledTimes(6);
  });

  test("a second call during a pass joins it instead of starting another", async () => {
    await seedSchemes([{ id: 1 }, { id: 2 }]);

    await Promise.all([startSchemeImageSync(), startSchemeImageSync()]);

    expect(mockDownload).toHaveBeenCalledTimes(2);
  });

  test("drops the result when the scheme image changed while it was downloading", async () => {
    const db = await seedSchemes([{ id: 1 }]);
    mockDownload.mockImplementation(async (url, dest) => {
      await db
        .update(schemes)
        .set({ image: "/media/new.jpg" })
        .where(eq(schemes.id, 1));
      await writesFile(url, dest);
    });

    await startSchemeImageSync();

    expect(storedFileNames(db)).toEqual([{ id: 1, fileName: null }]);
    expect(mockFiles.size).toBe(0);
  });

  test("a stale download neither replaces the new image nor counts as done", async () => {
    const db = await seedSchemes([{ id: 1 }]);
    let finishStale = () => {};
    mockDownload.mockImplementationOnce(
      (url, dest) =>
        new Promise((resolve) => {
          finishStale = () => void writesFile(url, dest).then(resolve);
        }),
    );
    const pass = startSchemeImageSync();
    await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
    await db
      .update(schemes)
      .set({ image: "/media/lesson_schemes/new1.jpg" })
      .where(eq(schemes.id, 1));

    renderHook(() =>
      useSchemeImage({
        id: 1,
        image: "/media/lesson_schemes/new1.jpg",
        localImagePath: null,
      }),
    );
    await waitFor(() =>
      expect(storedFileNames(db)).toEqual([{ id: 1, fileName: "1.jpg" }]),
    );
    finishStale();
    await pass;

    expect([...mockFiles]).toEqual([
      [`${IMAGES}/1.jpg`, "https://api.test/media/lesson_schemes/new1.jpg"],
    ]);
    expect(mockCapture).toHaveBeenCalledWith(
      "scheme_images_drained",
      expect.objectContaining({ downloaded: 0 }),
    );
  });

  test("aborts a download that receives no data for 20 seconds", async () => {
    await seedSchemes([{ id: 1 }]);
    jest.useFakeTimers();
    mockDownload.mockImplementation(
      (_url, _dest, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener("abort", () =>
            reject(new Error("AbortError")),
          );
        }),
    );

    const pass = startSchemeImageSync();
    await jest.advanceTimersByTimeAsync(20_000);
    await pass;
    jest.useRealTimers();

    expect(mockCapture).toHaveBeenCalledWith(
      "scheme_images_sweep_failed",
      expect.objectContaining({ error_name: new RequestTimeoutError("").name }),
    );
  });

  test("keeps a slow download alive while data keeps arriving", async () => {
    const db = await seedSchemes([{ id: 1 }]);
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

    const pass = startSchemeImageSync();
    await jest.advanceTimersByTimeAsync(50_000);
    await pass;
    jest.useRealTimers();

    expect(storedFileNames(db)).toEqual([{ id: 1, fileName: "1.jpg" }]);
  });
});

describe("resumeSchemeImageSync", () => {
  test("downloads missing images even before anything was counted", async () => {
    const db = await seedSchemes([{ id: 1 }]);

    await resumeSchemeImageSync();

    expect(storedFileNames(db)).toEqual([{ id: 1, fileName: "1.jpg" }]);
  });

  test("does nothing once every image is known to be on disk", async () => {
    await seedSchemes([{ id: 1 }]);
    await startSchemeImageSync();
    mockFiles.set(`${IMAGES}/stray.jpg`, "");

    await resumeSchemeImageSync();

    expect(mockFiles.has(`${IMAGES}/stray.jpg`)).toBe(true);
  });
});

describe("useSchemeImageStatus", () => {
  test("counts downloaded images before any pass has run", async () => {
    mockFiles.set(`${IMAGES}/1.jpg`, "");
    await seedSchemes([{ id: 1, localImagePath: "1.jpg" }, { id: 2 }, { id: 3 }]);

    const { result } = renderHook(() => useSchemeImageStatus());

    await waitFor(() =>
      expect(result.current).toEqual({ pending: 2, total: 3, isRunning: false }),
    );
  });

  test("counts down as each image is saved", async () => {
    await seedSchemes([{ id: 1 }, { id: 2 }]);
    let finishSecond = () => {};
    mockDownload.mockImplementation((url, dest) =>
      url.endsWith("beat1.jpg")
        ? writesFile(url, dest)
        : new Promise((resolve) => {
            finishSecond = () => void writesFile(url, dest).then(resolve);
          }),
    );
    const { result } = renderHook(() => useSchemeImageStatus());

    const pass = startSchemeImageSync();

    await waitFor(() =>
      expect(result.current).toEqual({ pending: 1, total: 2, isRunning: true }),
    );
    finishSecond();
    await pass;
    await waitFor(() =>
      expect(result.current).toEqual({ pending: 0, total: 2, isRunning: false }),
    );
  });

  test("reaches zero pending once a pass drains the queue", async () => {
    await seedSchemes([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useSchemeImageStatus());

    await startSchemeImageSync();

    await waitFor(() =>
      expect(result.current).toEqual({ pending: 0, total: 2, isRunning: false }),
    );
  });
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
    expect(mockDownload.mock.calls[0][0]).toContain("beat1_abc123.jpg");
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

  test("reports failure when the scheme image changed while it was downloading", async () => {
    await seedSchemes([{ id: 7 }]);

    const { result } = renderHook(() =>
      useSchemeImage({
        id: 7,
        image: "/media/lesson_schemes/old7.jpg",
        localImagePath: null,
      }),
    );

    await waitFor(() => expect(result.current.state).toBe("failed"));
  });

  test("retry downloads the image again and resumes the background pass", async () => {
    const db = await seedSchemes([{ id: 7 }, { id: 8 }]);
    mockDownload.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSchemeImage(scheme(7)));
    await waitFor(() => expect(result.current.state).toBe("failed"));

    act(() => {
      if (result.current.state === "failed") result.current.retry();
    });

    expect(result.current).toEqual({ state: "loading" });
    await waitFor(() =>
      expect(storedFileNames(db)).toEqual([
        { id: 7, fileName: "7.jpg" },
        { id: 8, fileName: "8.jpg" },
      ]),
    );
    expect(result.current).toEqual(readyFile("7.jpg"));
    expect(mockDownload).toHaveBeenCalledTimes(3);
  });

  test("a failed image appears once the background pass saves it", async () => {
    await seedSchemes([{ id: 7 }]);
    mockDownload.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useSchemeImage(scheme(7)));
    await waitFor(() => expect(result.current.state).toBe("failed"));

    await act(() => startSchemeImageSync());

    expect(result.current).toEqual(readyFile("7.jpg"));
  });
});
