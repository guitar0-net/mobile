// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { components } from "./api.types";
import { queryClient } from "./query-client";

type LessonsList = components["schemas"]["LessonsList"];
type LessonDetail = components["schemas"]["LessonDetail"];
type PaginatedLessonsListList = components["schemas"]["PaginatedLessonsListList"];

function getBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) throw new Error("EXPO_PUBLIC_API_URL is not configured");
  return url;
}

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${getBaseUrl()}${path}`);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new Error(`Failed to parse JSON response for ${path}`, { cause });
  }
}

export async function getLessons(): Promise<LessonsList[]> {
  const data = await queryClient.fetchQuery({
    queryKey: ["lessons"],
    queryFn: () => apiFetch<PaginatedLessonsListList>("/api/v1/lessons/"),
  });
  return data.results;
}

export async function getLesson(uuid: string): Promise<LessonDetail> {
  return queryClient.fetchQuery({
    queryKey: ["lesson", uuid],
    queryFn: () => apiFetch<LessonDetail>(`/api/v1/lessons/${uuid}/`),
  });
}
