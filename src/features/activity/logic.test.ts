// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  advanceStreak,
  buildGridColumns,
  buildMonthLabels,
  enumerateLocalDayKeys,
  formatCellDateRu,
  groupByLocalDay,
  intensityBucket,
  journalDayHeading,
  localDayKey,
  monthsBackDayKey,
  resolveDisplayedStreak,
  splitSessionAcrossMidnight,
} from "./logic";

describe("localDayKey", () => {
  test.each([
    ["2026-01-05T10:30:00", "2026-01-05"],
    ["2026-01-05T00:00:00", "2026-01-05"],
    ["2026-01-05T23:59:59", "2026-01-05"],
    ["2026-03-09T12:00:00", "2026-03-09"],
    ["2026-12-31T23:59:59", "2026-12-31"],
  ])("formats %s as %s (local time, zero-padded)", (input, expected) => {
    expect(localDayKey(new Date(input))).toBe(expected);
  });
});

describe("splitSessionAcrossMidnight", () => {
  test("a session that stays within one local day is a single chunk", () => {
    const start = new Date("2026-01-05T10:00:00");
    const end = new Date("2026-01-05T10:05:00");

    expect(splitSessionAcrossMidnight(start, end)).toEqual([
      { date: "2026-01-05", seconds: 300 },
    ]);
  });

  test("a session crossing one midnight splits proportionally between the two days", () => {
    const start = new Date("2026-01-05T23:50:00");
    const end = new Date("2026-01-06T00:10:00");

    expect(splitSessionAcrossMidnight(start, end)).toEqual([
      { date: "2026-01-05", seconds: 600 },
      { date: "2026-01-06", seconds: 600 },
    ]);
  });

  test("a session ending exactly at midnight is attributed entirely to the day it started", () => {
    const start = new Date("2026-01-05T23:00:00");
    const end = new Date("2026-01-06T00:00:00");

    expect(splitSessionAcrossMidnight(start, end)).toEqual([
      { date: "2026-01-05", seconds: 3600 },
    ]);
  });

  test("a sub-second remainder just past midnight rounds to zero and is dropped", () => {
    const start = new Date("2026-01-05T23:59:59.000");
    const end = new Date("2026-01-06T00:00:00.200");

    expect(splitSessionAcrossMidnight(start, end)).toEqual([
      { date: "2026-01-05", seconds: 1 },
    ]);
  });

  test("a session spanning multiple midnights produces one chunk per day", () => {
    const start = new Date("2026-01-05T23:00:00");
    const end = new Date("2026-01-08T01:00:00");

    expect(splitSessionAcrossMidnight(start, end)).toEqual([
      { date: "2026-01-05", seconds: 3600 },
      { date: "2026-01-06", seconds: 86400 },
      { date: "2026-01-07", seconds: 86400 },
      { date: "2026-01-08", seconds: 3600 },
    ]);
  });

  test("a zero-duration session produces no chunks", () => {
    const same = new Date("2026-01-05T10:00:00");
    expect(splitSessionAcrossMidnight(same, same)).toEqual([]);
  });

  test("a negative-duration session (clock skew) produces no chunks", () => {
    const start = new Date("2026-01-05T10:00:00");
    const end = new Date("2026-01-05T09:00:00");
    expect(splitSessionAcrossMidnight(start, end)).toEqual([]);
  });
});

describe("advanceStreak", () => {
  test("first-ever activity starts the streak at 1", () => {
    const result = advanceStreak(
      { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
      "2026-01-05",
    );
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: "2026-01-05",
    });
  });

  test("a consecutive day extends the streak", () => {
    const result = advanceStreak(
      { currentStreak: 3, longestStreak: 5, lastActiveDate: "2026-01-05" },
      "2026-01-06",
    );
    expect(result).toEqual({
      currentStreak: 4,
      longestStreak: 5,
      lastActiveDate: "2026-01-06",
    });
  });

  test("a new longest streak updates longestStreak too", () => {
    const result = advanceStreak(
      { currentStreak: 5, longestStreak: 5, lastActiveDate: "2026-01-05" },
      "2026-01-06",
    );
    expect(result).toEqual({
      currentStreak: 6,
      longestStreak: 6,
      lastActiveDate: "2026-01-06",
    });
  });

  test("the same day again is a no-op", () => {
    const prev = { currentStreak: 3, longestStreak: 5, lastActiveDate: "2026-01-05" };
    expect(advanceStreak(prev, "2026-01-05")).toEqual(prev);
  });

  test("a gap of a full missed day resets the streak to 1", () => {
    const result = advanceStreak(
      { currentStreak: 10, longestStreak: 10, lastActiveDate: "2026-01-05" },
      "2026-01-07",
    );
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 10,
      lastActiveDate: "2026-01-07",
    });
  });

  test("a large gap also resets the streak to 1, preserving longestStreak", () => {
    const result = advanceStreak(
      { currentStreak: 10, longestStreak: 10, lastActiveDate: "2026-01-05" },
      "2026-03-01",
    );
    expect(result).toEqual({
      currentStreak: 1,
      longestStreak: 10,
      lastActiveDate: "2026-03-01",
    });
  });

  test("a consecutive day across a month boundary still counts", () => {
    const result = advanceStreak(
      { currentStreak: 1, longestStreak: 1, lastActiveDate: "2026-01-31" },
      "2026-02-01",
    );
    expect(result).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      lastActiveDate: "2026-02-01",
    });
  });
});

describe("intensityBucket", () => {
  test.each([
    [0, 0],
    [1, 1],
    [299, 1],
    [300, 2],
    [899, 2],
    [900, 3],
    [1799, 3],
    [1800, 4],
    [3599, 4],
    [3600, 5],
    [7200, 5],
  ])("%i seconds maps to bucket %i", (seconds, expected) => {
    expect(intensityBucket(seconds)).toBe(expected);
  });
});

describe("enumerateLocalDayKeys", () => {
  test("a single-day range returns just that day", () => {
    expect(enumerateLocalDayKeys("2026-01-05", "2026-01-05")).toEqual(["2026-01-05"]);
  });

  test("returns every day inclusive, in chronological order", () => {
    expect(enumerateLocalDayKeys("2026-01-05", "2026-01-08")).toEqual([
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
    ]);
  });

  test("crosses a month boundary", () => {
    expect(enumerateLocalDayKeys("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  test("crosses a year boundary", () => {
    expect(enumerateLocalDayKeys("2025-12-30", "2026-01-02")).toEqual([
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
    ]);
  });
});

describe("monthsBackDayKey", () => {
  test("one month back within the same year", () => {
    expect(monthsBackDayKey(new Date("2026-03-15T10:00:00"), 1)).toBe("2026-02-15");
  });

  test("twelve months back crosses a year boundary", () => {
    expect(monthsBackDayKey(new Date("2026-06-10T10:00:00"), 12)).toBe("2025-06-10");
  });

  test("zero months back returns the same day", () => {
    expect(monthsBackDayKey(new Date("2026-06-10T10:00:00"), 0)).toBe("2026-06-10");
  });

  test("clamps into a shorter target month instead of overflowing into the next one", () => {
    expect(monthsBackDayKey(new Date("2026-03-31T10:00:00"), 1)).toBe("2026-02-28");
  });

  test("clamps a leap day onto the last day of February in a non-leap year", () => {
    expect(monthsBackDayKey(new Date("2028-02-29T10:00:00"), 12)).toBe("2027-02-28");
  });
});

describe("buildGridColumns", () => {
  test("an empty history produces no columns", () => {
    expect(buildGridColumns([])).toEqual([]);
  });

  test("a history starting on Sunday fills one column with no padding", () => {
    const history = enumerateLocalDayKeys("2026-01-04", "2026-01-10").map((date) => ({
      date,
      totalSeconds: 0,
    }));

    const columns = buildGridColumns(history);

    expect(columns).toHaveLength(1);
    expect(columns[0].map((cell) => cell?.date ?? null)).toEqual([
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
    ]);
  });

  test("a history starting mid-week pads the front of the first column and the back of the last", () => {
    // 2026-01-07 is a Wednesday; 7 days spills one row into a second column.
    const history = enumerateLocalDayKeys("2026-01-07", "2026-01-13").map((date) => ({
      date,
      totalSeconds: 0,
    }));

    const columns = buildGridColumns(history);

    expect(columns).toHaveLength(2);
    expect(columns[0].map((cell) => cell?.date ?? null)).toEqual([
      null,
      null,
      null,
      "2026-01-07",
      "2026-01-08",
      "2026-01-09",
      "2026-01-10",
    ]);
    expect(columns[1].map((cell) => cell?.date ?? null)).toEqual([
      "2026-01-11",
      "2026-01-12",
      "2026-01-13",
      null,
      null,
      null,
      null,
    ]);
  });

  test("each cell carries the intensity bucket for its totalSeconds", () => {
    const history = [
      { date: "2026-01-04", totalSeconds: 0 },
      { date: "2026-01-05", totalSeconds: 1800 },
      { date: "2026-01-06", totalSeconds: 3600 },
    ];

    const columns = buildGridColumns(history);

    expect(columns[0].slice(0, 3).map((cell) => cell?.bucket)).toEqual([0, 4, 5]);
  });
});

describe("buildMonthLabels", () => {
  test("an empty grid has no labels", () => {
    expect(buildMonthLabels([])).toEqual([]);
  });

  test("labels the first column with its month", () => {
    const history = enumerateLocalDayKeys("2026-01-04", "2026-01-10").map((date) => ({
      date,
      totalSeconds: 0,
    }));
    const columns = buildGridColumns(history);

    expect(buildMonthLabels(columns)).toEqual([{ columnIndex: 0, label: "Янв" }]);
  });

  test("adds one label per month boundary crossed, not per column", () => {
    const history = enumerateLocalDayKeys("2026-01-25", "2026-03-05").map((date) => ({
      date,
      totalSeconds: 0,
    }));
    const columns = buildGridColumns(history);

    const labels = buildMonthLabels(columns);
    expect(labels.map((l) => l.label)).toEqual(["Янв", "Фев", "Мар"]);
    expect(labels[0].columnIndex).toBeLessThan(labels[1].columnIndex);
    expect(labels[1].columnIndex).toBeLessThan(labels[2].columnIndex);
  });

  test("columns with only null padding cells get no label", () => {
    // A single day starting mid-week pads the rest of that column with null.
    const columns = buildGridColumns([{ date: "2026-01-07", totalSeconds: 0 }]);
    expect(buildMonthLabels(columns)).toEqual([{ columnIndex: 0, label: "Янв" }]);
  });
});

describe("groupByLocalDay", () => {
  test("groups consecutive same-day entries together", () => {
    const entries = [
      { id: "1", occurredAt: "2026-01-05T18:00:00" },
      { id: "2", occurredAt: "2026-01-05T10:00:00" },
      { id: "3", occurredAt: "2026-01-04T10:00:00" },
    ];

    expect(groupByLocalDay(entries)).toEqual([
      { dayKey: "2026-01-05", entries: [entries[0], entries[1]] },
      { dayKey: "2026-01-04", entries: [entries[2]] },
    ]);
  });

  test("an empty list produces no groups", () => {
    expect(groupByLocalDay([])).toEqual([]);
  });

  test("does not merge two same-day runs separated by a different day", () => {
    const entries = [
      { id: "1", occurredAt: "2026-01-05T10:00:00" },
      { id: "2", occurredAt: "2026-01-04T10:00:00" },
      { id: "3", occurredAt: "2026-01-05T09:00:00" },
    ];

    expect(groupByLocalDay(entries).map((g) => g.dayKey)).toEqual([
      "2026-01-05",
      "2026-01-04",
      "2026-01-05",
    ]);
  });
});

describe("journalDayHeading", () => {
  test("today's day key reads as Сегодня", () => {
    expect(journalDayHeading("2026-01-05", "2026-01-05")).toBe("Сегодня");
  });

  test("yesterday's day key reads as Вчера", () => {
    expect(journalDayHeading("2026-01-04", "2026-01-05")).toBe("Вчера");
  });

  test("older days show as day + abbreviated month", () => {
    expect(journalDayHeading("2026-01-03", "2026-01-05")).toBe("3 янв");
  });

  test("crosses a month boundary correctly", () => {
    expect(journalDayHeading("2025-12-31", "2026-01-05")).toBe("31 дек");
  });
});

describe("formatCellDateRu", () => {
  test("formats a day key as day + abbreviated month + year", () => {
    expect(formatCellDateRu("2026-01-03")).toBe("3 янв 2026");
  });

  test("disambiguates cells from a year ago, unlike journalDayHeading", () => {
    expect(formatCellDateRu("2025-01-03")).toBe("3 янв 2025");
  });
});

describe("resolveDisplayedStreak", () => {
  test("last active today shows the stored streak unchanged", () => {
    expect(resolveDisplayedStreak(4, "2026-01-05", "2026-01-05")).toBe(4);
  });

  test("last active yesterday still shows the stored streak (not yet broken)", () => {
    expect(resolveDisplayedStreak(4, "2026-01-04", "2026-01-05")).toBe(4);
  });

  test("a full missed day shows zero", () => {
    expect(resolveDisplayedStreak(4, "2026-01-03", "2026-01-05")).toBe(0);
  });

  test("no activity ever recorded shows zero", () => {
    expect(resolveDisplayedStreak(0, null, "2026-01-05")).toBe(0);
  });
});
