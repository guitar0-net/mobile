// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/features/settings/storage";

import { resetTunerForTesting } from "./__tests__/testing";
import { useTunerStore } from "./store";

beforeEach(() => {
  resetTunerForTesting();
});

describe("setTuningId", () => {
  test("updates tuningId in store", () => {
    useTunerStore.getState().setTuningId("drop-d");
    expect(useTunerStore.getState().tuningId).toBe("drop-d");
  });

  test("persists to storage", () => {
    useTunerStore.getState().setTuningId("open-g");
    expect(storage.getString("tuner.tuningId")).toBe("open-g");
  });

  test("resets selectedStringIndex to null when tuning changes", () => {
    useTunerStore.setState({ selectedStringIndex: 2 });
    useTunerStore.getState().setTuningId("drop-d");
    expect(useTunerStore.getState().selectedStringIndex).toBeNull();
  });
});

describe("setTuningForkEnabled", () => {
  test("enables tuning fork", () => {
    useTunerStore.getState().setTuningForkEnabled(true);
    expect(useTunerStore.getState().tuningForkEnabled).toBe(true);
  });

  test("disables tuning fork", () => {
    useTunerStore.setState({ tuningForkEnabled: true });
    useTunerStore.getState().setTuningForkEnabled(false);
    expect(useTunerStore.getState().tuningForkEnabled).toBe(false);
  });

  test("persists to storage", () => {
    useTunerStore.getState().setTuningForkEnabled(true);
    expect(storage.getBoolean("tuner.tuningForkEnabled")).toBe(true);
  });
});

describe("setDetectedFrequency", () => {
  test("sets frequency", () => {
    useTunerStore.getState().setDetectedFrequency(440);
    expect(useTunerStore.getState().detectedFrequency).toBe(440);
  });

  test("clears frequency to null", () => {
    useTunerStore.setState({ detectedFrequency: 440 });
    useTunerStore.getState().setDetectedFrequency(null);
    expect(useTunerStore.getState().detectedFrequency).toBeNull();
  });
});

describe("setSelectedStringIndex", () => {
  test("sets string index (enters manual mode)", () => {
    useTunerStore.getState().setSelectedStringIndex(3);
    expect(useTunerStore.getState().selectedStringIndex).toBe(3);
  });

  test("sets null (returns to auto mode)", () => {
    useTunerStore.setState({ selectedStringIndex: 2 });
    useTunerStore.getState().setSelectedStringIndex(null);
    expect(useTunerStore.getState().selectedStringIndex).toBeNull();
  });
});
