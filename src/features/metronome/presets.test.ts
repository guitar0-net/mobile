// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent } from "expo-precision-metronome";

import { getSizeName, getTempoName, patternsEqual } from "./presets";

describe("patternsEqual", () => {
  test("identical patterns are equal", () => {
    expect(patternsEqual(["strong", "normal"], ["strong", "normal"])).toBe(true);
  });

  test("empty patterns are equal", () => {
    expect(patternsEqual([], [])).toBe(true);
  });

  test("different lengths are not equal", () => {
    expect(patternsEqual(["strong"], ["strong", "normal"])).toBe(false);
  });

  test("same length but different accents are not equal", () => {
    expect(patternsEqual(["strong", "normal"], ["strong", "muted"])).toBe(false);
  });

  test("order matters", () => {
    expect(patternsEqual(["strong", "muted"], ["muted", "strong"])).toBe(false);
  });
});

describe("getTempoName", () => {
  test.each<[number, string]>([
    [20, "Ларго"],
    [59, "Ларго"],
    [60, "Адажио"],
    [65, "Адажио"],
    [66, "Анданте"],
    [75, "Анданте"],
    [76, "Модерато"],
    [107, "Модерато"],
    [108, "Аллегро"],
    [167, "Аллегро"],
    [168, "Престо"],
    [200, "Престо"],
    [201, "Престиссимо"],
    [300, "Престиссимо"],
  ])("bpm %i → %s", (bpm, expected) => {
    expect(getTempoName(bpm)).toBe(expected);
  });
});

describe("getSizeName", () => {
  test("returns preset label when pattern matches a preset", () => {
    expect(getSizeName(["strong", "normal"], [])).toBe("2/4");
    expect(getSizeName(["strong", "normal", "normal"], [])).toBe("3/4");
    expect(getSizeName(["strong", "normal", "normal", "normal"], [])).toBe("4/4");
  });

  test("returns saved size name when no preset matches", () => {
    const saved = [
      { name: "Мой вальс", beatPattern: ["strong", "muted", "normal"] as BeatAccent[] },
    ];
    expect(getSizeName(["strong", "muted", "normal"], saved)).toBe("Мой вальс");
  });

  test("returns 'Свой размер' when neither preset nor saved matches", () => {
    expect(getSizeName(["strong", "muted"], [])).toBe("Свой размер");
  });

  test("preset takes priority over saved size with the same pattern", () => {
    const saved = [
      { name: "Мой 2/4", beatPattern: ["strong", "normal"] as BeatAccent[] },
    ];
    expect(getSizeName(["strong", "normal"], saved)).toBe("2/4");
  });
});
