// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ApiError } from "@/lib/network";

export type SyncFailureKind = "offline" | "busy" | "server" | "rejected" | "unknown";

export type SyncFailure = {
  kind: SyncFailureKind;
  label: string;
  /** Appended to a screen's own "не удалось …" prefix, so it carries no trailing period. */
  reason: string;
};

const FAILURES: Record<SyncFailureKind, SyncFailure> = {
  offline: {
    kind: "offline",
    label: "Нет соединения",
    reason: "Проверьте подключение к интернету",
  },
  busy: {
    kind: "busy",
    label: "Сервер занят",
    reason: "Слишком много запросов — попробуйте через минуту",
  },
  server: {
    kind: "server",
    label: "Сервер недоступен",
    reason: "Сервер временно недоступен, попробуйте позже",
  },
  rejected: {
    kind: "rejected",
    label: "Ошибка синхронизации",
    reason: "Попробуйте позже или обновите приложение",
  },
  unknown: {
    kind: "unknown",
    label: "Ошибка синхронизации",
    reason: "Попробуйте ещё раз позже",
  },
};

// nginx answers a tripped `limit_req` with 503 by default (api_limit zone in
// infrastructure/ansible), so 503 means "slow down" as often as "upstream is down".
const BUSY_STATUSES = [429, 503];

export function describeSyncFailure(error: unknown): SyncFailure {
  if (error instanceof ApiError) {
    if (BUSY_STATUSES.includes(error.status)) return FAILURES.busy;
    if (error.status >= 500) return FAILURES.server;
    return FAILURES.rejected;
  }
  // RN's fetch rejects with a TypeError only when the request never reached the server.
  if (error instanceof TypeError) return FAILURES.offline;
  return FAILURES.unknown;
}
