// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { pluralRu } from "@/lib/utils";

export function formatRelativeTimeRu(
  timestamp: number | null,
  now: number = Date.now(),
): string {
  if (timestamp === null) return "ещё не выполнялась";

  const diffSeconds = Math.floor((now - timestamp) / 1000);
  if (diffSeconds < 60) return "только что";

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${pluralRu(diffMinutes, "минуту", "минуты", "минут")} назад`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${pluralRu(diffHours, "час", "часа", "часов")} назад`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${pluralRu(diffDays, "день", "дня", "дней")} назад`;
}
