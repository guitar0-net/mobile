// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  return url;
}

export async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(`Failed to parse JSON response for ${path}`, { cause });
  }
}
