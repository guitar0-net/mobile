// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

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

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`);
  await throwIfNotOk(response);
  return parseJson<T>(response, path);
}

type BinaryResponse = {
  data: ArrayBuffer;
  filename: string | null;
};

export async function apiPostBinary(
  path: string,
  body: unknown,
): Promise<BinaryResponse> {
  const response = await post(path, body);
  return {
    data: await response.arrayBuffer(),
    filename: parseFilename(response.headers.get("Content-Disposition")),
  };
}

function parseFilename(contentDisposition: string | null): string | null {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}

export async function apiPostJson<T>(path: string, body: unknown): Promise<T> {
  const response = await post(path, body);
  return parseJson<T>(response, path);
}

async function post(path: string, body: unknown): Promise<Response> {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfNotOk(response);
  return response;
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (response.ok) return;
  throw new ApiError(response.status, await readErrorDetail(response));
}

async function parseJson<T>(response: Response, path: string): Promise<T> {
  try {
    return (await response.json()) as T;
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
