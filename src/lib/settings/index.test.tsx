// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";

import { resetSettingsForTesting } from "./__tests__/testing";
import {
  useDiagramSettings,
  useFavorites,
  useFontSize,
  useProgress,
  useThemePreference,
} from "./index";

beforeEach(() => {
  resetSettingsForTesting();
});

// ---------------------------------------------------------------------------
// useThemePreference
// ---------------------------------------------------------------------------

describe("useThemePreference", () => {
  test("theme defaults to undefined (no stored preference)", () => {
    const { result } = renderHook(() => useThemePreference());
    expect(result.current.theme).toBeUndefined();
  });

  test("setTheme write-read roundtrip", () => {
    const { result } = renderHook(() => useThemePreference());

    act(() => {
      result.current.setTheme("dark");
    });
    expect(result.current.theme).toBe("dark");

    act(() => {
      result.current.setTheme("contrast-light");
    });
    expect(result.current.theme).toBe("contrast-light");
  });
});

// ---------------------------------------------------------------------------
// useFontSize
// ---------------------------------------------------------------------------

describe("useFontSize", () => {
  test("fontSize defaults to 'md'", () => {
    const { result } = renderHook(() => useFontSize());
    expect(result.current.fontSize).toBe("md");
  });

  test("setFontSize write-read roundtrip", () => {
    const { result } = renderHook(() => useFontSize());

    act(() => {
      result.current.setFontSize("lg");
    });
    expect(result.current.fontSize).toBe("lg");
  });
});

// ---------------------------------------------------------------------------
// useDiagramSettings
// ---------------------------------------------------------------------------

describe("useDiagramSettings — defaults", () => {
  test("chordSize defaults to 'md'", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.chordSize).toBe("md");
  });

  test("chordOrientation defaults to 'vertical'", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.chordOrientation).toBe("vertical");
  });

  test("chordVisible defaults to true", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.chordVisible).toBe(true);
  });

  test("imageSchemeSize defaults to 'md'", () => {
    const { result } = renderHook(() => useDiagramSettings());
    expect(result.current.imageSchemeSize).toBe("md");
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
      result.current.setChordSize("sm");
    });
    expect(result.current.chordSize).toBe("sm");
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
      result.current.setImageSchemeSize("lg");
    });
    expect(result.current.imageSchemeSize).toBe("lg");
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
