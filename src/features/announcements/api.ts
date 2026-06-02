// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { apiFetch } from "@/lib/network";
import type { components } from "@/lib/network/api.types";

export type AnnouncementItem = components["schemas"]["AnnouncementsList"];
export type AnnouncementDetail = components["schemas"]["AnnouncementDetail"];
type PaginatedAnnouncementsListList =
  components["schemas"]["PaginatedAnnouncementsListList"];

export async function getAnnouncements(
  limit: number,
  offset: number,
): Promise<PaginatedAnnouncementsListList> {
  return apiFetch<PaginatedAnnouncementsListList>(
    `/api/v1/announcements/?limit=${limit}&offset=${offset}`,
  );
}

export async function getAnnouncement(uuid: string): Promise<AnnouncementDetail> {
  return apiFetch<AnnouncementDetail>(`/api/v1/announcements/${uuid}/`);
}
