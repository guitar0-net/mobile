// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fetch as expoFetch } from "expo/fetch";

const REQUEST_TIMEOUT_MS = 60_000;
const STALL_TIMEOUT_MS = 30_000;

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  return url;
}

// Carries the HTTP status code (and the server's `detail`, when present) so
// callers can tell a permanent rejection (422) apart from a transient one
// (502) instead of treating every non-OK response the same way.
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail?: string) {
    super(detail ?? `HTTP error: ${status}`);
    this.name = "ApiError";
    this.status = status;
  }
}

export class RequestTimeoutError extends Error {
  constructor(target: string) {
    super(`Request timed out: ${target}`);
    this.name = "RequestTimeoutError";
  }
}

export async function apiFetch<T>(path: string): Promise<T> {
  return request(path, undefined, (response) => parseJson<T>(response.text(), path));
}

/**
 * Like `apiFetch`, but reports the body bytes received so far and gives up
 * only after 30 seconds without new data, so a slow download is never cut off.
 */
export async function apiFetchStreaming<T>(
  path: string,
  onBytes: (received: number) => void,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const controller = new AbortController();
  let stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  const resetStallTimer = () => {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => controller.abort(), STALL_TIMEOUT_MS);
  };
  try {
    const response = await asNetworkError(
      expoFetch(url, { signal: controller.signal }),
    );
    resetStallTimer();
    await throwIfNotOk(response);
    const text = await readBody(response, (received) => {
      resetStallTimer();
      onBytes(received);
    });
    return parseJson<T>(text, path);
  } catch (error) {
    if (controller.signal.aborted) throw new RequestTimeoutError(path);
    throw error;
  } finally {
    clearTimeout(stallTimer);
  }
}

async function readBody(
  response: Response,
  onChunk: (received: number) => void,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let received = 0;
  for (;;) {
    const { done, value } = await asNetworkError(reader.read());
    if (done) return text + decoder.decode();
    received += value.byteLength;
    text += decoder.decode(value, { stream: true });
    onChunk(received);
  }
}

// expo/fetch rejects with a plain Error on network failure, unlike the Fetch
// spec and RN's global fetch, which use TypeError.
async function asNetworkError<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new TypeError(message, { cause });
  }
}

type BinaryResponse = {
  data: ArrayBuffer;
  filename: string | null;
};

export async function apiPostBinary(
  path: string,
  body: unknown,
): Promise<BinaryResponse> {
  return request(path, jsonPost(body), async (response) => ({
    data: await response.arrayBuffer(),
    filename: parseFilename(response.headers.get("Content-Disposition")),
  }));
}

function parseFilename(contentDisposition: string | null): string | null {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  return request(path, jsonPost(body), (response) =>
    parseJson<T>(response.text(), path),
  );
}

function jsonPost(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    await throwIfNotOk(response);
    return await read(response);
  } catch (error) {
    if (controller.signal.aborted) throw new RequestTimeoutError(path);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  throw new ApiError(response.status, await readErrorDetail(response));
}

async function parseJson<T>(text: string | Promise<string>, path: string): Promise<T> {
  try {
    return JSON.parse(await text) as T;
  } catch (cause) {
    throw new Error(`Failed to parse JSON response for ${path}`, { cause });
  }
}

async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "detail" in data) {
      const { detail } = data as { detail: unknown };
      if (typeof detail === "string") return detail;
    }
  } catch {
    // Error responses aren't guaranteed to have a JSON body (e.g. a 502 from
    // a proxy in front of the API) — fall back to the generic message.
  }
  return undefined;
}
