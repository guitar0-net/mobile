// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  advanceStreak,
  localDayKey,
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
