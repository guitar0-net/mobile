// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";

import { resetSettingsForTesting } from "./__tests__/testing";
import {
  useDiagramSettings,
  useFavorites,
  useFontSize,
  useHideCompletedLessons,
  useProgress,
  useThemePreference,
} from "./index";
import { storage } from "./storage";
import { readDefaults } from "./store";

beforeEach(() => {
  resetSettingsForTesting();
});

// ---------------------------------------------------------------------------
// useThemePreference
// ---------------------------------------------------------------------------

describe("useThemePreference", () => {
  test('themeMode defaults to "system" and highContrast defaults to false', () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current.themeMode).toBe("system");
    expect(result.current.highContrast).toBe(false);
  });

  test("setThemeMode write-read roundtrip", () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setThemeMode("dark");
    });
    expect(result.current.themeMode).toBe("dark");

    act(() => {
      result.current.setThemeMode("light");
    });
    expect(result.current.themeMode).toBe("light");
  });

  test("setHighContrast write-read roundtrip, independent of themeMode", () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setThemeMode("dark");
      result.current.setHighContrast(true);
    });
    expect(result.current.highContrast).toBe(true);
    expect(result.current.themeMode).toBe("dark");
  });
});

// ---------------------------------------------------------------------------
// useFontSize
// ---------------------------------------------------------------------------

describe("useFontSize", () => {
  test("fontSize defaults to 3", () => {
    const { result } = renderHook(() => useFontSize());
    expect(result.current.fontSize).toBe(3);
  });

  test("setFontSize write-read roundtrip", () => {
    const { result } = renderHook(() => useFontSize());

    act(() => {
      result.current.setFontSize(4);
    });
    expect(result.current.fontSize).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// useDiagramSettings
// ---------------------------------------------------------------------------

describe("useDiagramSettings — defaults", () => {
  test("chordSize defaults to 3", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.chordSize).toBe(3);
  });

  test("chordOrientation defaults to 'vertical'", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.chordOrientation).toBe("vertical");
  });

  test("chordVisible defaults to true", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.chordVisible).toBe(true);
  });

  test("imageSchemeSize defaults to 3", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.imageSchemeSize).toBe(3);
  });

  test("imageSchemeVisible defaults to true", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.imageSchemeVisible).toBe(true);
  });
});

describe("useDiagramSettings — setters", () => {
  test("setChordSize write-read roundtrip", () => {
    const { result } = renderHook(() => useDiagramSettings());

    act(() => {
      result.current.setChordSize(1);
    });
    expect(result.current.chordSize).toBe(1);
  });

  test("setChordOrientation write-read roundtrip", () => {
    const { result } = renderHook(() => useDiagramSettings());

    act(() => {
      result.current.setChordOrientation("horizontal");
    });
    expect(result.current.chordOrientation).toBe("horizontal");
  });

  test("setChordVisible write-read roundtrip", () => {
    const { result } = renderHook(() => useDiagramSettings());

    act(() => {
      result.current.setChordVisible(false);
    });
    expect(result.current.chordVisible).toBe(false);
  });

  test("setImageSchemeSize write-read roundtrip", () => {
    const { result } = renderHook(() => useDiagramSettings());

    act(() => {
      result.current.setImageSchemeSize(5);
    });
    expect(result.current.imageSchemeSize).toBe(5);
  });

  test("setImageSchemeVisible write-read roundtrip", () => {
    const { result } = renderHook(() => useDiagramSettings());

    act(() => {
      result.current.setImageSchemeVisible(false);
    });
    expect(result.current.imageSchemeVisible).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useFavorites
// ---------------------------------------------------------------------------

describe("useFavorites", () => {
  test("favorites defaults to empty array", () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
  });

  test("addFavorite appends a UUID to the list", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite("lesson-uuid-1");
    });
    expect(result.current.favorites).toEqual(["lesson-uuid-1"]);

    act(() => {
      result.current.addFavorite("lesson-uuid-2");
    });
    expect(result.current.favorites).toEqual(["lesson-uuid-1", "lesson-uuid-2"]);
  });

  test("removeFavorite removes the specified UUID", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite("lesson-uuid-1");
      result.current.addFavorite("lesson-uuid-2");
    });

    act(() => {
      result.current.removeFavorite("lesson-uuid-1");
    });
    expect(result.current.favorites).toEqual(["lesson-uuid-2"]);
  });

  test("removeFavorite on unknown UUID leaves the list unchanged", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.addFavorite("lesson-uuid-1");
    });

    act(() => {
      result.current.removeFavorite("does-not-exist");
    });
    expect(result.current.favorites).toEqual(["lesson-uuid-1"]);
  });
});

// ---------------------------------------------------------------------------
// useProgress
// ---------------------------------------------------------------------------

describe("useProgress", () => {
  test("progress defaults to empty object", () => {
    const { result } = renderHook(() => useProgress());
    expect(result.current.progress).toEqual({});
  });

  test("setVideoViewed marks video as viewed for a lesson", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setVideoViewed("lesson-uuid-1", true);
    });
    expect(result.current.progress["lesson-uuid-1"]?.videoViewed).toBe(true);
    expect(result.current.progress["lesson-uuid-1"]?.completedSongIds).toEqual([]);
  });

  test("setVideoViewed can unmark a previously viewed video", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setVideoViewed("lesson-uuid-1", true);
    });
    act(() => {
      result.current.setVideoViewed("lesson-uuid-1", false);
    });
    expect(result.current.progress["lesson-uuid-1"]?.videoViewed).toBe(false);
  });

  test("setSongCompleted adds a song UUID to completedSongIds", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-a", true);
    });
    expect(result.current.progress["lesson-uuid-1"]?.completedSongIds).toEqual([
      "song-uuid-a",
    ]);
  });

  test("setSongCompleted does not duplicate already completed songs", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-a", true);
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-a", true);
    });
    expect(result.current.progress["lesson-uuid-1"]?.completedSongIds).toEqual([
      "song-uuid-a",
    ]);
  });

  test("setSongCompleted removes a song when completed=false", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-a", true);
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-b", true);
    });
    act(() => {
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-a", false);
    });
    expect(result.current.progress["lesson-uuid-1"]?.completedSongIds).toEqual([
      "song-uuid-b",
    ]);
  });

  test("video and song progress are tracked independently within a lesson", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setVideoViewed("lesson-uuid-1", true);
      result.current.setSongCompleted("lesson-uuid-1", "song-uuid-a", true);
    });
    expect(result.current.progress["lesson-uuid-1"]).toEqual({
      videoViewed: true,
      completedSongIds: ["song-uuid-a"],
    });
  });

  test("tracks multiple lessons independently", () => {
    const { result } = renderHook(() => useProgress());

    act(() => {
      result.current.setVideoViewed("uuid-a", true);
      result.current.setSongCompleted("uuid-b", "song-1", true);
    });
    expect(result.current.progress["uuid-a"]?.videoViewed).toBe(true);
    expect(result.current.progress["uuid-a"]?.completedSongIds).toEqual([]);
    expect(result.current.progress["uuid-b"]?.completedSongIds).toEqual(["song-1"]);
  });
});

// ---------------------------------------------------------------------------
// useHideCompletedLessons
// ---------------------------------------------------------------------------

describe("useHideCompletedLessons", () => {
  test("defaults to false", () => {
    const { result } = renderHook(() => useHideCompletedLessons());
    expect(result.current.hideCompletedLessons).toBe(false);
  });

  test("setHideCompletedLessons write-read roundtrip", () => {
    const { result } = renderHook(() => useHideCompletedLessons());

    act(() => {
      result.current.setHideCompletedLessons(true);
    });
    expect(result.current.hideCompletedLessons).toBe(true);

    act(() => {
      result.current.setHideCompletedLessons(false);
    });
    expect(result.current.hideCompletedLessons).toBe(false);
  });

  test("persists via MMKV and reads back after simulated restart", () => {
    const { result } = renderHook(() => useHideCompletedLessons());

    act(() => {
      result.current.setHideCompletedLessons(true);
    });

    expect(readDefaults().hideCompletedLessons).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// readDefaults — tryParse fallback on invalid JSON
// ---------------------------------------------------------------------------

describe("readDefaults — invalid JSON in storage", () => {
  test("returns empty favorites array when stored value is not valid JSON", () => {
    storage.set("settings.favorites", "NOT_VALID_JSON");
    const defaults = readDefaults();
    expect(defaults.favorites).toEqual([]);
  });

  test("returns empty progress object when stored value is not valid JSON", () => {
    storage.set("settings.progress", "{broken}");
    const defaults = readDefaults();
    expect(defaults.progress).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// readDefaults — valid stored values exercise the true branches of parse fns
// ---------------------------------------------------------------------------

describe("readDefaults — valid stored values", () => {
  test("returns stored themeMode when a valid mode is stored", () => {
    storage.set("settings.themeMode", "dark");
    expect(readDefaults().themeMode).toBe("dark");
  });

  test('returns default themeMode ("system") when stored value is unrecognized', () => {
    storage.set("settings.themeMode", "not-a-mode");
    expect(readDefaults().themeMode).toBe("system");
  });

  test("returns stored highContrast when a valid boolean is stored", () => {
    storage.set("settings.highContrast", true);
    expect(readDefaults().highContrast).toBe(true);
  });

  test("returns stored fontSize when a valid size is stored", () => {
    storage.set("settings.fontSize", 4);
    expect(readDefaults().fontSize).toBe(4);
  });

  test("returns default fontSize when an invalid size is stored", () => {
    storage.set("settings.fontSize", 99);
    expect(readDefaults().fontSize).toBe(3);
  });

  test("returns stored chordSize when a valid size is stored", () => {
    storage.set("settings.chordSize", 1);
    expect(readDefaults().chordSize).toBe(1);
  });

  test("returns default chordSize when an invalid value is stored", () => {
    storage.set("settings.chordSize", 99);
    expect(readDefaults().chordSize).toBe(3);
  });

  test("returns stored chordOrientation when horizontal is stored", () => {
    storage.set("settings.chordOrientation", "horizontal");
    expect(readDefaults().chordOrientation).toBe("horizontal");
  });

  test("returns default orientation when an invalid value is stored", () => {
    storage.set("settings.chordOrientation", "diagonal");
    expect(readDefaults().chordOrientation).toBe("vertical");
  });

  test("returns stored imageSchemeSize when a valid size is stored", () => {
    storage.set("settings.imageSchemeSize", 5);
    expect(readDefaults().imageSchemeSize).toBe(5);
  });
});
