// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { centDeviation, findNearestString, noteFrequency, TUNINGS } from "./tunings";

const STANDARD = TUNINGS.find((t) => t.id === "standard")!;

describe("noteFrequency", () => {
  test("A4 = 440 Hz", () => {
    expect(noteFrequency("A", 4)).toBeCloseTo(440, 2);
  });

  test("E2 (string 6 standard) ≈ 82.41 Hz", () => {
    expect(noteFrequency("E", 2)).toBeCloseTo(82.41, 1);
  });

  test("A2 (string 5 standard) = 110 Hz", () => {
    expect(noteFrequency("A", 2)).toBeCloseTo(110.0, 1);
  });

  test("H3 (B3, string 2 standard) ≈ 246.94 Hz", () => {
    expect(noteFrequency("H", 3)).toBeCloseTo(246.94, 1);
  });

  test("E4 (string 1 standard) ≈ 329.63 Hz", () => {
    expect(noteFrequency("E", 4)).toBeCloseTo(329.63, 1);
  });

  test("each octave doubles the frequency", () => {
    expect(noteFrequency("A", 5)).toBeCloseTo(noteFrequency("A", 4) * 2, 5);
  });
});

describe("centDeviation", () => {
  test("returns 0 when detected equals target", () => {
    expect(centDeviation(440, 440)).toBeCloseTo(0, 5);
  });

  test("returns 100 for one semitone sharp", () => {
    const oneUp = 440 * Math.pow(2, 1 / 12);
    expect(centDeviation(oneUp, 440)).toBeCloseTo(100, 3);
  });

  test("returns -100 for one semitone flat", () => {
    const oneDown = 440 * Math.pow(2, -1 / 12);
    expect(centDeviation(oneDown, 440)).toBeCloseTo(-100, 3);
  });

  test("returns ~50 when half a semitone sharp", () => {
    const halfUp = 440 * Math.pow(2, 0.5 / 12);
    expect(centDeviation(halfUp, 440)).toBeCloseTo(50, 2);
  });
});

describe("findNearestString (auto mode)", () => {
  test("detects A2 (string 5) from exact frequency", () => {
    const result = findNearestString(110.0, STANDARD);
    expect(result.stringIndex).toBe(1); // index 1 = string 5
    expect(result.note).toBe("A");
    expect(result.cents).toBeCloseTo(0, 2);
  });

  test("detects E4 (string 1) from exact frequency", () => {
    const result = findNearestString(329.63, STANDARD);
    expect(result.stringIndex).toBe(5); // index 5 = string 1
    expect(result.note).toBe("E");
  });

  test("detects nearest string when slightly sharp", () => {
    // A2 + 20 cents → still closest to A2
    const sharpA = 110.0 * Math.pow(2, 20 / 1200);
    const result = findNearestString(sharpA, STANDARD);
    expect(result.stringIndex).toBe(1);
    expect(result.cents).toBeCloseTo(20, 1);
  });

  test("targetFrequency matches expected note frequency", () => {
    const result = findNearestString(196.0, STANDARD);
    expect(result.targetFrequency).toBeCloseTo(
      noteFrequency(result.note, result.octave),
      5,
    );
  });
});

describe("findNearestString (manual mode)", () => {
  test("uses only the fixed string even if another is closer", () => {
    // Pass 110 Hz (A2) but fix to string 6 (E2 = 82.41 Hz)
    const result = findNearestString(110.0, STANDARD, 0);
    expect(result.stringIndex).toBe(0);
    expect(result.note).toBe("E");
    expect(result.cents).toBeGreaterThan(0); // 110 Hz is sharp relative to E2
  });
});

describe("TUNINGS", () => {
  test("contains exactly 5 tunings", () => {
    expect(TUNINGS).toHaveLength(5);
  });

  test("standard tuning string 6 is E2", () => {
    expect(STANDARD.strings[0]).toEqual({ note: "E", octave: 2 });
  });

  test("standard tuning string 1 is E4", () => {
    expect(STANDARD.strings[5]).toEqual({ note: "E", octave: 4 });
  });

  test("each tuning has 6 strings", () => {
    TUNINGS.forEach((t) => expect(t.strings).toHaveLength(6));
  });

  test("each tuning has a unique id", () => {
    const ids = TUNINGS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
