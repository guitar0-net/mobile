// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { and, count, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { Directory, File, Paths } from "expo-file-system";
import type { ImageSource } from "expo-image";
import { useEffect, useMemo } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { capture, captureException } from "@/lib/analytics";
import { getDb, schemes, songSchemes } from "@/lib/db";
import { RequestTimeoutError } from "@/lib/network";

import { BUNDLED_SCHEME_IMAGES } from "./bundled-schemes";

const CONCURRENCY = 2;
const CONSECUTIVE_FAILURE_LIMIT = 5;
const STALL_TIMEOUT_MS = 20_000;

type SchemeRef = { id: number; image: string };

export type SchemeImageStatus = {
  pending: number;
  total: number;
  isRunning: boolean;
};

const useStatusStore = create<SchemeImageStatus & { isCounted: boolean }>(() => ({
  pending: 0,
  total: 0,
  isRunning: false,
  isCounted: false,
}));

let activePass: Promise<void> | null = null;
let passesSinceLaunch = 0;
const inFlight = new Map<number, Promise<void>>();

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

function forgetMissingFiles(): void {
  const db = getDb();
  const stored = db
    .select({ id: schemes.id, fileName: schemes.localImagePath })
    .from(schemes)
    .where(isNotNull(schemes.localImagePath))
    .all();
  for (const { id, fileName } of stored) {
    if (fileName && !new File(imagesDir(), fileName).exists) {
      db.update(schemes).set({ localImagePath: null }).where(eq(schemes.id, id)).run();
    }
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
async function saveToDisk(scheme: SchemeRef): Promise<void> {
  const dir = imagesDir();
  dir.create({ intermediates: true, idempotent: true });
  const fileName = fileNameFor(scheme);
  const tmpName = `.tmp-${fileName}`;
  try {
    await downloadWithStallTimeout(remoteUrl(scheme.image), new File(dir, tmpName));
    new File(dir, tmpName).moveSync(new File(dir, fileName), { overwrite: true });
    getDb()
      .update(schemes)
      .set({ localImagePath: fileName })
      .where(and(eq(schemes.id, scheme.id), eq(schemes.image, scheme.image)))
      .run();
    refreshCounts();
  } finally {
    const leftover = new File(dir, tmpName);
    if (leftover.exists) leftover.delete();
  }
}

function download(scheme: SchemeRef): Promise<void> {
  const existing = inFlight.get(scheme.id);
  if (existing) return existing;
  const task = saveToDisk(scheme).finally(() => inFlight.delete(scheme.id));
  inFlight.set(scheme.id, task);
  return task;
}

async function runPass(): Promise<void> {
  const startedAt = Date.now();
  forgetMissingFiles();
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
        await download(scheme);
        downloaded += 1;
        consecutiveFailures = 0;
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

/**
 * Picks what to show for a scheme: the downloaded file, else the image bundled
 * with the app, else the server URL. A scheme shown without a downloaded file
 * gets one download attempt.
 */
export function useSchemeImageSource(scheme: DisplayedScheme): ImageSource | number {
  const { id, image, localImagePath } = scheme;
  const localFile = useMemo(() => {
    if (!localImagePath) return null;
    const file = new File(imagesDir(), localImagePath);
    return file.exists ? file : null;
  }, [localImagePath]);

  useEffect(() => {
    if (localFile) return;
    download({ id, image }).catch(() => {});
  }, [localFile, id, image]);

  if (localFile) return { uri: localFile.uri };
  return BUNDLED_SCHEME_IMAGES[id] ?? { uri: remoteUrl(image) };
}

export function deleteSchemeImageFiles(fileNames: string[]): void {
  for (const fileName of fileNames) {
    const file = new File(imagesDir(), fileName);
    if (file.exists) file.delete();
  }
}

export function deleteAllSchemeImages(): void {
  const dir = imagesDir();
  if (dir.exists) dir.delete();
  useStatusStore.setState({ pending: 0, total: 0, isRunning: false, isCounted: false });
}
