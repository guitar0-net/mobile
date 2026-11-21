// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter, useSegments } from "expo-router";

import type { ReportSource, ReportTarget } from "./queue";

type FormSource = Exclude<ReportSource, "video_error">;

const FORM_SOURCES: readonly FormSource[] = [
  "song_footer",
  "lesson_footer",
  "settings",
];

export type ReportRouteParams = {
  type?: string;
  id?: string;
  source?: string;
  from?: string;
};

export type ReportRequest = {
  target: ReportTarget;
  source: FormSource;
  from: string;
};

/** Opens the report screen and remembers which screen it was opened from. */
export function useOpenReport() {
  const router = useRouter();
  const segments = useSegments();

  return (target: ReportTarget, source: FormSource) => {
    const params: ReportRouteParams = {
      type: target.type,
      source,
      from: `/${segments.join("/")}`,
    };
    if (target.type !== "app") params.id = target.id;
    router.push({ pathname: "/report", params });
  };
}

export function parseReportParams({
  type,
  id,
  source,
  from,
}: ReportRouteParams): ReportRequest | null {
  const formSource = FORM_SOURCES.find((candidate) => candidate === source);
  if (!formSource || !from) return null;
  if (type === "app") return { target: { type }, source: formSource, from };
  if ((type === "song" || type === "lesson") && id) {
    return { target: { type, id }, source: formSource, from };
  }
  return null;
}
