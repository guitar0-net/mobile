// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { formatRelativeTimeRu } from "./format-relative-time-ru";

const NOW = new Date("2026-07-18T12:00:00.000Z").getTime();

describe("formatRelativeTimeRu", () => {
  test("returns a never-synced message for null", () => {
    expect(formatRelativeTimeRu(null, NOW)).toBe("ещё не выполнялась");
  });

  test('returns "только что" for less than a minute ago', () => {
    expect(formatRelativeTimeRu(NOW - 30_000, NOW)).toBe("только что");
  });

  test("uses accusative singular for 1 minute ago", () => {
    expect(formatRelativeTimeRu(NOW - 60_000, NOW)).toBe("1 минуту назад");
  });

  test("uses genitive singular for 2-4 minutes ago", () => {
    expect(formatRelativeTimeRu(NOW - 3 * 60_000, NOW)).toBe("3 минуты назад");
  });

  test("uses genitive plural for 5+ minutes ago", () => {
    expect(formatRelativeTimeRu(NOW - 5 * 60_000, NOW)).toBe("5 минут назад");
  });

  test("switches to hours after 60 minutes", () => {
    expect(formatRelativeTimeRu(NOW - 2 * 60 * 60_000, NOW)).toBe("2 часа назад");
  });

  test("switches to days after 24 hours", () => {
    expect(formatRelativeTimeRu(NOW - 3 * 24 * 60 * 60_000, NOW)).toBe("3 дня назад");
  });
});
