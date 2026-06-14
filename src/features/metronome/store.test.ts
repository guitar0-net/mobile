// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/features/settings/storage";

import { resetMetronomeForTesting } from "./__tests__/testing";
import { BPM_MAX, BPM_MIN, useMetronomeStore } from "./store";

beforeEach(() => {
  resetMetronomeForTesting();
});

describe("setBpm", () => {
  test("sets a valid BPM value", () => {
    useMetronomeStore.getState().setBpm(120);
    expect(useMetronomeStore.getState().bpm).toBe(120);
  });

  test("clamps below BPM_MIN to BPM_MIN", () => {
    useMetronomeStore.getState().setBpm(BPM_MIN - 1);
    expect(useMetronomeStore.getState().bpm).toBe(BPM_MIN);
  });

  test("clamps above BPM_MAX to BPM_MAX", () => {
    useMetronomeStore.getState().setBpm(BPM_MAX + 1);
    expect(useMetronomeStore.getState().bpm).toBe(BPM_MAX);
  });

  test("rounds fractional values", () => {
    useMetronomeStore.getState().setBpm(119.7);
    expect(useMetronomeStore.getState().bpm).toBe(120);
  });

  test("persists to storage", () => {
    useMetronomeStore.getState().setBpm(140);
    expect(storage.getNumber("metronome.bpm")).toBe(140);
  });
});

describe("setBeatPattern", () => {
  test("updates beatPattern in store", () => {
    useMetronomeStore.getState().setBeatPattern(["strong", "normal"]);
    expect(useMetronomeStore.getState().beatPattern).toEqual(["strong", "normal"]);
  });

  test("persists serialized pattern to storage", () => {
    useMetronomeStore.getState().setBeatPattern(["strong", "muted"]);
    expect(storage.getString("metronome.beatPattern")).toBe(
      JSON.stringify(["strong", "muted"]),
    );
  });
});

describe("setSoundPreset", () => {
  test("updates soundPreset in store", () => {
    useMetronomeStore.getState().setSoundPreset("click");
    expect(useMetronomeStore.getState().soundPreset).toBe("click");
  });

  test("persists to storage", () => {
    useMetronomeStore.getState().setSoundPreset("beep");
    expect(storage.getString("metronome.soundPreset")).toBe("beep");
  });
});

describe("setScreenAwakeEnabled", () => {
  test("updates screenAwakeEnabled", () => {
    useMetronomeStore.getState().setScreenAwakeEnabled(true);
    expect(useMetronomeStore.getState().screenAwakeEnabled).toBe(true);
  });

  test("persists to storage", () => {
    useMetronomeStore.getState().setScreenAwakeEnabled(true);
    expect(storage.getBoolean("metronome.screenAwake")).toBe(true);
  });
});

describe("saveCurrentPattern", () => {
  test("appends a new saved pattern with current beatPattern", () => {
    useMetronomeStore.getState().setBeatPattern(["strong", "muted", "normal"]);
    useMetronomeStore.getState().saveCurrentPattern("Мой вальс");

    const { savedPatterns } = useMetronomeStore.getState();
    expect(savedPatterns).toHaveLength(1);
    expect(savedPatterns[0].name).toBe("Мой вальс");
    expect(savedPatterns[0].beatPattern).toEqual(["strong", "muted", "normal"]);
  });

  test("trims whitespace from name", () => {
    useMetronomeStore.getState().saveCurrentPattern("  Вальс  ");
    expect(useMetronomeStore.getState().savedPatterns[0].name).toBe("Вальс");
  });

  test("appends to existing saved patterns", () => {
    useMetronomeStore.getState().saveCurrentPattern("Первый");
    useMetronomeStore.getState().saveCurrentPattern("Второй");
    expect(useMetronomeStore.getState().savedPatterns).toHaveLength(2);
  });

  test("persists to storage", () => {
    useMetronomeStore.getState().saveCurrentPattern("Тест");
    const stored = JSON.parse(storage.getString("metronome.savedPatterns") ?? "[]");
    expect(stored[0].name).toBe("Тест");
  });
});

describe("deleteSavedPattern", () => {
  beforeEach(() => {
    useMetronomeStore.getState().saveCurrentPattern("Первый");
    useMetronomeStore.getState().saveCurrentPattern("Второй");
    useMetronomeStore.getState().saveCurrentPattern("Третий");
  });

  test("removes the pattern at the given index", () => {
    useMetronomeStore.getState().deleteSavedPattern(1);
    const names = useMetronomeStore.getState().savedPatterns.map((s) => s.name);
    expect(names).toEqual(["Первый", "Третий"]);
  });

  test("removes the first pattern", () => {
    useMetronomeStore.getState().deleteSavedPattern(0);
    expect(useMetronomeStore.getState().savedPatterns).toHaveLength(2);
    expect(useMetronomeStore.getState().savedPatterns[0].name).toBe("Второй");
  });

  test("persists the updated list to storage", () => {
    useMetronomeStore.getState().deleteSavedPattern(0);
    const stored = JSON.parse(storage.getString("metronome.savedPatterns") ?? "[]");
    expect(stored).toHaveLength(2);
  });
});

describe("renameSavedPattern", () => {
  beforeEach(() => {
    useMetronomeStore.getState().saveCurrentPattern("Старое имя");
  });

  test("renames the pattern at the given index", () => {
    useMetronomeStore.getState().renameSavedPattern(0, "Новое имя");
    expect(useMetronomeStore.getState().savedPatterns[0].name).toBe("Новое имя");
  });

  test("trims whitespace from the new name", () => {
    useMetronomeStore.getState().renameSavedPattern(0, "  Обрезанное  ");
    expect(useMetronomeStore.getState().savedPatterns[0].name).toBe("Обрезанное");
  });

  test("only renames the targeted index", () => {
    useMetronomeStore.getState().saveCurrentPattern("Второй");
    useMetronomeStore.getState().renameSavedPattern(0, "Изменённый");
    expect(useMetronomeStore.getState().savedPatterns[1].name).toBe("Второй");
  });

  test("persists renamed list to storage", () => {
    useMetronomeStore.getState().renameSavedPattern(0, "Сохранённое");
    const stored = JSON.parse(storage.getString("metronome.savedPatterns") ?? "[]");
    expect(stored[0].name).toBe("Сохранённое");
  });
});

describe("setIsPlaying", () => {
  test("sets isPlaying to true", () => {
    useMetronomeStore.getState().setIsPlaying(true);
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
  });

  test("setting false resets currentBeat to -1", () => {
    useMetronomeStore.setState({ isPlaying: true, currentBeat: 2 });
    useMetronomeStore.getState().setIsPlaying(false);
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
    expect(useMetronomeStore.getState().currentBeat).toBe(-1);
  });

  test("setting true does not reset currentBeat", () => {
    useMetronomeStore.setState({ currentBeat: 3 });
    useMetronomeStore.getState().setIsPlaying(true);
    expect(useMetronomeStore.getState().currentBeat).toBe(3);
  });
});

describe("setCurrentBeat", () => {
  test("updates currentBeat", () => {
    useMetronomeStore.getState().setCurrentBeat(2);
    expect(useMetronomeStore.getState().currentBeat).toBe(2);
  });
});
