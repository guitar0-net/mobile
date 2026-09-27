// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { eq } from "drizzle-orm";
import { Directory, File, Paths } from "expo-file-system";
import type { ImageSource } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { create } from "zustand";

import { captureException } from "@/lib/analytics";
import { getDb, schemes } from "@/lib/db";
import { RequestTimeoutError } from "@/lib/network";

import { BUNDLED_SCHEME_IMAGES } from "./bundled-schemes";

const STALL_TIMEOUT_MS = 20_000;
const TMP_PREFIX = ".tmp-";

type SchemeRef = { id: number; image: string };

type SavedState = { saved: Record<number, { fileName: string }> };

const useSavedStore = create<SavedState>(() => ({ saved: {} }));

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
      .select({ image: schemes.image })
      .from(schemes)
      .where(eq(schemes.id, scheme.id))
      .get();
    if (!current || current.image !== scheme.image) return false;
    new File(dir, tmpName).moveSync(new File(dir, fileName), { overwrite: true });
    db.update(schemes)
      .set({ localImagePath: fileName })
      .where(eq(schemes.id, scheme.id))
      .run();
    useSavedStore.setState((state) => ({
      saved: { ...state.saved, [scheme.id]: { fileName } },
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

type DisplayedScheme = SchemeRef & { localImagePath: string | null };

export type SchemeImageState =
  | { state: "ready"; source: ImageSource | number }
  | { state: "loading" }
  | { state: "failed"; retry: () => void };

/**
 * Shows the image bundled with the app for this `image` path, else the
 * downloaded file. Otherwise downloads the file and reports `loading` until
 * it is saved, or `failed` with a `retry`.
 */
export function useSchemeImage(scheme: DisplayedScheme): SchemeImageState {
  const { id, image, localImagePath } = scheme;
  const bundled = BUNDLED_SCHEME_IMAGES[image];
  const saved = useSavedStore((state) => state.saved[id]);
  const localFile = useMemo(() => {
    if (bundled !== undefined) return null;
    const fileName = saved?.fileName ?? localImagePath;
    if (!fileName) return null;
    const file = new File(imagesDir(), fileName);
    return file.exists ? file : null;
  }, [bundled, saved, localImagePath]);
  const [attempt, setAttempt] = useState(0);
  const [failedAttempt, setFailedAttempt] = useState<string | null>(null);
  const attemptKey = `${id}:${image}:${attempt}`;

  useEffect(() => {
    if (bundled !== undefined || localFile) return;
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
  }, [bundled, localFile, id, image, attemptKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (bundled !== undefined) return { state: "ready", source: bundled };
  if (localFile) return { state: "ready", source: { uri: localFile.uri } };
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
  useSavedStore.setState({ saved: {} });
}
