// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  cn,
  describeRemainingItems,
  formatDateRu,
  formatHoursMinutesRu,
  formatTimeRu,
  formatTodayRu,
  pluralFormRu,
  pluralRu,
  stripMarkdown,
  withAlpha,
} from "./utils";

describe("cn", () => {
  test("joins truthy strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  test("filters out falsy values", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });

  test("returns empty string when all values are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  test("handles a single class", () => {
    expect(cn("only")).toBe("only");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active",
    );
  });

  test("resolves Tailwind conflicts — last class wins", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    expect(cn("p-4", "px-6")).toBe("p-4 px-6");
  });

  test("accepts arrays and nested falsy values (clsx compat)", () => {
    expect(cn(["a", false, "b"], undefined, "c")).toBe("a b c");
  });
});

describe("pluralRu", () => {
  const tap = (n: number) => pluralRu(n, "нажатие", "нажатия", "нажатий");
  test("1 → нажатие", () => expect(tap(1)).toBe("1 нажатие"));
  test("2 → нажатия", () => expect(tap(2)).toBe("2 нажатия"));
  test("4 → нажатия", () => expect(tap(4)).toBe("4 нажатия"));
  test("5 → нажатий", () => expect(tap(5)).toBe("5 нажатий"));
  test("11 → нажатий (исключение)", () => expect(tap(11)).toBe("11 нажатий"));
  test("21 → нажатие", () => expect(tap(21)).toBe("21 нажатие"));
  test("114 → нажатий (исключение)", () => expect(tap(114)).toBe("114 нажатий"));
});

describe("pluralFormRu", () => {
  const form = (n: number) => pluralFormRu(n, "урок", "урока", "уроков");
  test("1 → урок", () => expect(form(1)).toBe("урок"));
  test("2 → урока", () => expect(form(2)).toBe("урока"));
  test("5 → уроков", () => expect(form(5)).toBe("уроков"));
  test("11 → уроков (исключение)", () => expect(form(11)).toBe("уроков"));
});

describe("describeRemainingItems", () => {
  describe("только песни (без видео)", () => {
    test("1 → осталась … песня", () =>
      expect(describeRemainingItems(1, false)).toBe("осталась 1 песня"));
    test("2 → остались … песни", () =>
      expect(describeRemainingItems(2, false)).toBe("остались 2 песни"));
    test("4 → остались … песни", () =>
      expect(describeRemainingItems(4, false)).toBe("остались 4 песни"));
    test("5 → осталось … песен", () =>
      expect(describeRemainingItems(5, false)).toBe("осталось 5 песен"));
    test("11 → осталось … песен (исключение)", () =>
      expect(describeRemainingItems(11, false)).toBe("осталось 11 песен"));
    test("21 → осталась … песня", () =>
      expect(describeRemainingItems(21, false)).toBe("осталась 21 песня"));
    test("114 → осталось … песен (исключение)", () =>
      expect(describeRemainingItems(114, false)).toBe("осталось 114 песен"));
  });

  describe("видео + песни", () => {
    test("1 песня → осталось видео и 1 песня", () =>
      expect(describeRemainingItems(1, true)).toBe("осталось видео и 1 песня"));
    test("2 песни → осталось видео и 2 песни", () =>
      expect(describeRemainingItems(2, true)).toBe("осталось видео и 2 песни"));
    test("5 песен → осталось видео и 5 песен", () =>
      expect(describeRemainingItems(5, true)).toBe("осталось видео и 5 песен"));
    test("11 песен (исключение) → осталось видео и 11 песен", () =>
      expect(describeRemainingItems(11, true)).toBe("осталось видео и 11 песен"));
  });

  describe("только видео", () => {
    test("0 песен + видео → осталось видео", () =>
      expect(describeRemainingItems(0, true)).toBe("осталось видео"));
  });

  describe("всё пройдено", () => {
    test("0 песен + нет видео → пустая строка", () =>
      expect(describeRemainingItems(0, false)).toBe(""));
  });
});

describe("formatDateRu", () => {
  test("formats date with day, month and year", () => {
    expect(formatDateRu("2026-01-15T00:00:00Z")).toBe("15 января 2026 г.");
  });

  test("formats different months correctly", () => {
    expect(formatDateRu("2026-06-01T00:00:00Z")).toBe("1 июня 2026 г.");
  });

  test("does not capitalize the result", () => {
    const result = formatDateRu("2026-01-01T00:00:00Z");
    expect(result[0]).toBe(result[0].toLowerCase());
  });
});

describe("formatTimeRu", () => {
  test("formats a morning time zero-padded", () => {
    const iso = new Date(2026, 0, 15, 9, 5).toISOString();
    expect(formatTimeRu(iso)).toBe("09:05");
  });

  test("formats an evening time in 24-hour form", () => {
    const iso = new Date(2026, 0, 15, 18, 20).toISOString();
    expect(formatTimeRu(iso)).toBe("18:20");
  });
});

describe("formatHoursMinutesRu", () => {
  test("under an hour shows only minutes", () => {
    expect(formatHoursMinutesRu(35 * 60)).toBe("35м");
  });

  test("an exact hour shows zero minutes", () => {
    expect(formatHoursMinutesRu(3600)).toBe("1ч 0м");
  });

  test("hours and minutes both shown", () => {
    expect(formatHoursMinutesRu(73 * 3600 + 35 * 60)).toBe("73ч 35м");
  });

  test("zero seconds", () => {
    expect(formatHoursMinutesRu(0)).toBe("0м");
  });
});

describe("stripMarkdown", () => {
  test("removes headings", () => {
    expect(stripMarkdown("# Заголовок")).toBe("Заголовок");
    expect(stripMarkdown("## H2\n### H3")).toBe("H2 H3");
  });

  test("removes bold and italic", () => {
    expect(stripMarkdown("**жирный** и *курсив*")).toBe("жирный и курсив");
    expect(stripMarkdown("__жирный__ и _курсив_")).toBe("жирный и курсив");
  });

  test("removes strikethrough", () => {
    expect(stripMarkdown("~~зачёркнутый~~")).toBe("зачёркнутый");
  });

  test("removes inline code", () => {
    expect(stripMarkdown("используй `console.log()`")).toBe("используй");
  });

  test("removes links but keeps text", () => {
    expect(stripMarkdown("[ссылка](https://example.com)")).toBe("ссылка");
  });

  test("removes images", () => {
    expect(stripMarkdown("![alt](image.png) текст")).toBe("текст");
  });

  test("removes blockquotes", () => {
    expect(stripMarkdown("> цитата")).toBe("цитата");
  });

  test("removes list markers", () => {
    expect(stripMarkdown("- пункт\n* другой\n1. нумерованный")).toBe(
      "пункт другой нумерованный",
    );
  });

  test("removes horizontal rules", () => {
    expect(stripMarkdown("текст\n---\nещё")).toBe("текст ещё");
  });

  test("collapses newlines into spaces", () => {
    expect(stripMarkdown("строка 1\n\nстрока 2")).toBe("строка 1 строка 2");
  });

  test("trims whitespace", () => {
    expect(stripMarkdown("  текст  ")).toBe("текст");
  });

  test("returns plain text unchanged", () => {
    expect(stripMarkdown("обычный текст")).toBe("обычный текст");
  });
});

describe("withAlpha", () => {
  test("opacity 0 appends 00", () => {
    expect(withAlpha("#FF5733", 0)).toBe("#FF573300");
  });

  test("opacity 1 appends ff", () => {
    expect(withAlpha("#FF5733", 1)).toBe("#FF5733ff");
  });

  test("opacity 0.5 appends 80", () => {
    // Math.round(0.5 * 255) = 128 = 0x80
    expect(withAlpha("#AABBCC", 0.5)).toBe("#AABBCC80");
  });

  test("single hex digit is padded to two characters", () => {
    // Math.round(0.01 * 255) = 3 = 0x03
    expect(withAlpha("#000000", 0.01)).toBe("#00000003");
  });
});

describe("formatTodayRu", () => {
  test("formats sunday correctly", () => {
    expect(formatTodayRu(new Date("2026-05-31"))).toBe("Воскресенье, 31 мая");
  });

  test("formats monday correctly", () => {
    expect(formatTodayRu(new Date("2026-06-01"))).toBe("Понедельник, 1 июня");
  });

  test("starts with uppercase", () => {
    const result = formatTodayRu(new Date("2026-05-31"));
    expect(result[0]).toBe(result[0].toUpperCase());
  });
});
