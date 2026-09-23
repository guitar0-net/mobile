// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, count, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { Directory, File, Paths } from "expo-file-system";
import type { ImageSource } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { capture, captureException } from "@/lib/analytics";
import { getDb, schemes, songSchemes } from "@/lib/db";
import { RequestTimeoutError } from "@/lib/network";

import { BUNDLED_SCHEME_IMAGES } from "./bundled-schemes";

const CONCURRENCY = 2;
const CONSECUTIVE_FAILURE_LIMIT = 5;
const STALL_TIMEOUT_MS = 20_000;
const TMP_PREFIX = ".tmp-";

type SchemeRef = { id: number; image: string };

export type SchemeImageStatus = {
  pending: number;
  total: number;
  isRunning: boolean;
};

type StatusState = SchemeImageStatus & {
  isCounted: boolean;
  saved: Record<number, { fileName: string }>;
};

const INITIAL_STATUS: StatusState = {
  pending: 0,
  total: 0,
  isRunning: false,
  isCounted: false,
  saved: {},
};

const useStatusStore = create<StatusState>(() => INITIAL_STATUS);

let activePass: Promise<void> | null = null;
let passesSinceLaunch = 0;
let downloadsSinceLaunch = 0;
const inFlight = new Map<string, Promise<boolean>>();

function imagesDir(): Directory {
  return new Directory(Paths.document, "images");
}

function remoteUrl(image: string): string {
  return image.startsWith("http")
    ? image
    : `${process.env.EXPO_PUBLIC_API_URL ?? ""}${image}`;
}

function fileNameFor({ id, image }: SchemeRef): string {
  const extension = /\.\w+$/.exec(image.split("?")[0])?.[0] ?? "";
  return `${id}${extension}`;
}

function linkedSchemeIds() {
  return getDb().select({ id: songSchemes.schemeId }).from(songSchemes);
}

function refreshCounts(): void {
  const row = getDb()
    .select({ total: count(), downloaded: count(schemes.localImagePath) })
    .from(schemes)
    .where(inArray(schemes.id, linkedSchemeIds()))
    .get();
  const total = row?.total ?? 0;
  useStatusStore.setState({
    total,
    pending: total - (row?.downloaded ?? 0),
    isCounted: true,
  });
}

function reconcileFiles(): void {
  const dir = imagesDir();
  const entries = dir.exists ? dir.list() : [];
  const onDisk = new Set(entries.map((entry) => entry.name));
  const referenced = new Set<string>();
  const db = getDb();
  const stored = db
    .select({ id: schemes.id, fileName: schemes.localImagePath })
    .from(schemes)
    .where(isNotNull(schemes.localImagePath))
    .all();
  for (const { id, fileName } of stored) {
    if (fileName && onDisk.has(fileName)) {
      referenced.add(fileName);
    } else {
      db.update(schemes).set({ localImagePath: null }).where(eq(schemes.id, id)).run();
    }
  }
  const isDownloading = inFlight.size > 0;
  for (const entry of entries) {
    if (referenced.has(entry.name)) continue;
    if (isDownloading && entry.name.startsWith(TMP_PREFIX)) continue;
    entry.delete();
  }
}

async function downloadWithStallTimeout(url: string, destination: File): Promise<void> {
  const controller = new AbortController();
  let stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  };
  try {
    await File.downloadFileAsync(url, destination, {
      idempotent: true,
      signal: controller.signal,
      onProgress: resetStallTimer,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new RequestTimeoutError(url);
    throw error;
  } finally {
    clearTimeout(stallTimer);
  }
}

// Android leaves a partially written file behind when a download fails midway.
async function saveToDisk(scheme: SchemeRef): Promise<boolean> {
  const dir = imagesDir();
  dir.create({ intermediates: true, idempotent: true });
  const fileName = fileNameFor(scheme);
  downloadsSinceLaunch += 1;
  const tmpName = `${TMP_PREFIX}${downloadsSinceLaunch}-${fileName}`;
  try {
    await downloadWithStallTimeout(remoteUrl(scheme.image), new File(dir, tmpName));
    const db = getDb();
    const current = db
      .select({ image: schemes.image, fileName: schemes.localImagePath })
      .from(schemes)
      .where(eq(schemes.id, scheme.id))
      .get();
    if (!current || current.image !== scheme.image) return false;
    new File(dir, tmpName).moveSync(new File(dir, fileName), { overwrite: true });
    db.update(schemes)
      .set({ localImagePath: fileName })
      .where(eq(schemes.id, scheme.id))
      .run();
    const wasPending = current.fileName === null;
    useStatusStore.setState((state) => ({
      saved: { ...state.saved, [scheme.id]: { fileName } },
      pending: wasPending ? Math.max(0, state.pending - 1) : state.pending,
    }));
    return true;
  } finally {
    const leftover = new File(dir, tmpName);
    if (leftover.exists) leftover.delete();
  }
}

/** Resolves `false` when the scheme image changed while it was downloading. */
function download(scheme: SchemeRef): Promise<boolean> {
  const key = `${scheme.id}:${scheme.image}`;
  const existing = inFlight.get(key);
  if (existing) return existing;
  const task = saveToDisk(scheme).finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

async function runPass(): Promise<void> {
  const startedAt = Date.now();
  reconcileFiles();
  refreshCounts();
  const queue = getDb()
    .select({ id: schemes.id, image: schemes.image })
    .from(schemes)
    .where(and(isNull(schemes.localImagePath), inArray(schemes.id, linkedSchemeIds())))
    .all();
  if (queue.length === 0) return;

  passesSinceLaunch += 1;
  useStatusStore.setState({ isRunning: true });
  let downloaded = 0;
  let consecutiveFailures = 0;
  let lastError: unknown = null;

  const worker = async () => {
    while (consecutiveFailures < CONSECUTIVE_FAILURE_LIMIT) {
      const scheme = queue.shift();
      if (!scheme) return;
      try {
        if (await download(scheme)) {
          downloaded += 1;
          consecutiveFailures = 0;
        }
      } catch (error) {
        consecutiveFailures += 1;
        lastError = error;
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  } finally {
    useStatusStore.setState({ isRunning: false });
  }

  refreshCounts();
  const { pending } = useStatusStore.getState();
  if (pending === 0) {
    capture("scheme_images_drained", {
      downloaded,
      passes: passesSinceLaunch,
      duration_ms: Date.now() - startedAt,
    });
  } else if (lastError !== null) {
    capture("scheme_images_sweep_failed", {
      error_name: lastError instanceof Error ? lastError.name : typeof lastError,
      error_message: lastError instanceof Error ? lastError.message.slice(0, 200) : "",
      pending,
      downloaded,
    });
  }
}

/**
 * Downloads every scheme image that is not on disk yet, two at a time.
 * A pass gives up after five failures in a row and waits for the next call.
 * Calling it while a pass is running returns that pass instead of starting another.
 */
export function startSchemeImageSync(): Promise<void> {
  activePass ??= runPass()
    .catch((error: unknown) => captureException(error, { stage: "scheme_images" }))
    .finally(() => {
      activePass = null;
    });
  return activePass;
}

/** Like `startSchemeImageSync`, but skips the pass when every image is known to be on disk. */
export function resumeSchemeImageSync(): Promise<void> {
  const { isCounted, pending } = useStatusStore.getState();
  if (isCounted && pending === 0) return Promise.resolve();
  return startSchemeImageSync();
}

export function useSchemeImageStatus(): SchemeImageStatus {
  useEffect(() => {
    if (useStatusStore.getState().isCounted) return;
    try {
      refreshCounts();
    } catch (error) {
      captureException(error, { stage: "scheme_images" });
    }
  }, []);
  return useStatusStore(
    useShallow(({ pending, total, isRunning }) => ({ pending, total, isRunning })),
  );
}

type DisplayedScheme = SchemeRef & { localImagePath: string | null };

export type SchemeImageState =
  | { state: "ready"; source: ImageSource | number }
  | { state: "loading" }
  | { state: "failed"; retry: () => void };

/**
 * Shows the downloaded file, else the image bundled with the app. Otherwise
 * downloads the file and reports `loading` until it is saved, or `failed`
 * with a `retry` that also resumes the background pass.
 */
export function useSchemeImage(scheme: DisplayedScheme): SchemeImageState {
  const { id, image, localImagePath } = scheme;
  const saved = useStatusStore((state) => state.saved[id]);
  const localFile = useMemo(() => {
    const fileName = saved?.fileName ?? localImagePath;
    if (!fileName) return null;
    const file = new File(imagesDir(), fileName);
    return file.exists ? file : null;
  }, [saved, localImagePath]);
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<string | null>(null);
  const attemptKey = `${id}:${image}:${attempt}`;

  useEffect(() => {
    if (localFile) return;
    let isCurrent = true;
    const fail = () => {
      if (isCurrent) setFailedAttempt(attemptKey);
    };
    download({ id, image }).then((isSaved) => {
      if (!isSaved) fail();
    }, fail);
    return () => {
      isCurrent = false;
    };
  }, [localFile, id, image, attemptKey]);

  const retry = useCallback(() => {
    setAttempt((value) => value + 1);
    void resumeSchemeImageSync();
  }, []);

  if (localFile) return { state: "ready", source: { uri: localFile.uri } };
  const bundled = BUNDLED_SCHEME_IMAGES[id];
  if (bundled !== undefined) return { state: "ready", source: bundled };
  if (failedAttempt === attemptKey) return { state: "failed", retry };
  return { state: "loading" };
}

export function deleteSchemeImageFiles(fileNames: string[]): void {
  for (const fileName of fileNames) {
    try {
      const file = new File(imagesDir(), fileName);
      if (file.exists) file.delete();
    } catch (error) {
      captureException(error, { stage: "scheme_images" });
    }
  }
}

export function deleteAllSchemeImages(): void {
  const dir = imagesDir();
  if (dir.exists) dir.delete();
  useStatusStore.setState(INITIAL_STATUS);
}
