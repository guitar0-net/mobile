// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ReportTarget } from "./queue";

export type ReportReason = {
  code: string;
  title: string;
  requiresMessage: boolean;
};

const reason = (
  code: string,
  title: string,
  requiresMessage = false,
): ReportReason => ({
  code,
  title,
  requiresMessage,
});

const DISPLAY_ISSUE = reason("display_issue", "Неправильно отображается");
const OTHER = reason("other", "Другое", true);

// Must match REASONS_BY_TARGET_TYPE and REASONS_REQUIRING_MESSAGE in the server's
// apps/reports/constants.py: the server rejects a required-message reason sent without one.
export const REASONS_BY_TARGET: Record<ReportTarget["type"], readonly ReportReason[]> =
  {
    song: [
      reason("wrong_chords", "Неверные аккорды"),
      reason("wrong_lyrics", "Ошибка в тексте песни"),
      reason("wrong_rhythm", "Неверный бой или ритм"),
      DISPLAY_ISSUE,
      OTHER,
    ],
    lesson: [
      reason("content_error", "Ошибка в содержании"),
      reason("typo", "Опечатка"),
      reason("broken_media", "Не загружается картинка или видео"),
      DISPLAY_ISSUE,
      OTHER,
    ],
    app: [
      reason("bug", "Ошибка в приложении", true),
      reason("feature_request", "Предложить функцию", true),
      OTHER,
    ],
  };
