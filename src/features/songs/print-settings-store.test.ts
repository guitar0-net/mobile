// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/features/settings/storage";

import { resetPrintSettingsForTesting } from "./__tests__/testing";
import { usePrintSettingsStore } from "./print-settings-store";

beforeEach(() => {
  resetPrintSettingsForTesting();
});

describe("defaults", () => {
  test("showChords is true by default", () => {
    expect(usePrintSettingsStore.getState().showChords).toBe(true);
  });

  test("showSchemes is true by default", () => {
    expect(usePrintSettingsStore.getState().showSchemes).toBe(true);
  });

  test("showText is true by default", () => {
    expect(usePrintSettingsStore.getState().showText).toBe(true);
  });

  test("chordOrientation is vertical by default", () => {
    expect(usePrintSettingsStore.getState().chordOrientation).toBe("vertical");
  });

  test("chordSize is 3 by default", () => {
    expect(usePrintSettingsStore.getState().chordSize).toBe(3);
  });

  test("columnsCount is 1 by default", () => {
    expect(usePrintSettingsStore.getState().columnsCount).toBe(1);
  });
});

describe("setShowChords", () => {
  test("updates showChords in store", () => {
    usePrintSettingsStore.getState().setShowChords(false);
    expect(usePrintSettingsStore.getState().showChords).toBe(false);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setShowChords(false);
    expect(storage.getBoolean("print.showChords")).toBe(false);
  });
});

describe("setShowSchemes", () => {
  test("updates showSchemes in store", () => {
    usePrintSettingsStore.getState().setShowSchemes(false);
    expect(usePrintSettingsStore.getState().showSchemes).toBe(false);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setShowSchemes(false);
    expect(storage.getBoolean("print.showSchemes")).toBe(false);
  });
});

describe("setShowText", () => {
  test("updates showText in store", () => {
    usePrintSettingsStore.getState().setShowText(false);
    expect(usePrintSettingsStore.getState().showText).toBe(false);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setShowText(false);
    expect(storage.getBoolean("print.showText")).toBe(false);
  });
});

describe("setChordOrientation", () => {
  test("updates chordOrientation in store", () => {
    usePrintSettingsStore.getState().setChordOrientation("horizontal");
    expect(usePrintSettingsStore.getState().chordOrientation).toBe("horizontal");
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setChordOrientation("horizontal");
    expect(storage.getString("print.chordOrientation")).toBe("horizontal");
  });
});

describe("setChordSize", () => {
  test("updates chordSize in store", () => {
    usePrintSettingsStore.getState().setChordSize(5);
    expect(usePrintSettingsStore.getState().chordSize).toBe(5);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setChordSize(5);
    expect(storage.getNumber("print.chordSize")).toBe(5);
  });
});

describe("setSchemeSize", () => {
  test("updates schemeSize in store", () => {
    usePrintSettingsStore.getState().setSchemeSize(1);
    expect(usePrintSettingsStore.getState().schemeSize).toBe(1);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setSchemeSize(1);
    expect(storage.getNumber("print.schemeSize")).toBe(1);
  });
});

describe("setTextSize", () => {
  test("updates textSize in store", () => {
    usePrintSettingsStore.getState().setTextSize(4);
    expect(usePrintSettingsStore.getState().textSize).toBe(4);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setTextSize(4);
    expect(storage.getNumber("print.textSize")).toBe(4);
  });
});

describe("setColumnsCount", () => {
  test("updates columnsCount in store", () => {
    usePrintSettingsStore.getState().setColumnsCount(3);
    expect(usePrintSettingsStore.getState().columnsCount).toBe(3);
  });

  test("persists to storage", () => {
    usePrintSettingsStore.getState().setColumnsCount(2);
    expect(storage.getNumber("print.columnsCount")).toBe(2);
  });
});
