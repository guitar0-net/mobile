// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { apiFetch, apiFetchStreaming } from "@/lib/network";
import type { components } from "@/lib/network/api.types";
import { queryClient } from "@/lib/network/query-client";

type LessonsList = components["schemas"]["LessonsList"];
type LessonDetail = components["schemas"]["LessonDetail"];
type PaginatedLessonsListList = components["schemas"]["PaginatedLessonsListList"];
export type SyncLessonsResponse = components["schemas"]["SyncLessonsResponse"];

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

export async function getSyncData(
  since: string | null,
  onBytes: (received: number) => void,
): Promise<SyncLessonsResponse> {
  const path =
    since !== null
      ? `/api/v1/sync/lessons/?since=${encodeURIComponent(since)}`
      : "/api/v1/sync/lessons/";
  return apiFetchStreaming<SyncLessonsResponse>(path, onBytes);
}
