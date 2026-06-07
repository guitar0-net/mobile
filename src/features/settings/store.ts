// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

import { THEME_DEFINITIONS, type ThemeName } from "@/lib/themes/definitions";

import { storage } from "./storage";

// --- UI Preferences ---

export type FontSize = 1 | 2 | 3 | 4 | 5;
export type DiagramSize = 1 | 2 | 3 | 4 | 5;
export type DiagramOrientation = "horizontal" | "vertical";

// --- Content Interaction ---

export type LessonProgress = {
  videoViewed: boolean;
  completedSongIds: string[];
};

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

type SettingsData = {
  // UI Preferences
  theme: ThemeName | undefined;
  fontSize: FontSize;
  chordSize: DiagramSize;
  chordOrientation: DiagramOrientation;
  chordVisible: boolean;
  imageSchemeSize: DiagramSize;
  imageSchemeVisible: boolean;

  // Content Interaction
  favorites: string[];
  progress: Record<string, LessonProgress>;
  hideCompletedLessons: boolean;
};

type SettingsActions = {
  // UI Preferences
  setTheme: (theme: ThemeName) => void;
  setFontSize: (size: FontSize) => void;
  setChordSize: (size: DiagramSize) => void;
  setChordOrientation: (orientation: DiagramOrientation) => void;
  setChordVisible: (visible: boolean) => void;
  setImageSchemeSize: (size: DiagramSize) => void;
  setImageSchemeVisible: (visible: boolean) => void;

  // Content Interaction
  addFavorite: (uuid: string) => void;
  removeFavorite: (uuid: string) => void;
  setVideoViewed: (lessonId: string, viewed: boolean) => void;
  setSongCompleted: (lessonId: string, songId: string, completed: boolean) => void;
  setHideCompletedLessons: (value: boolean) => void;
};

export type SettingsState = SettingsData & SettingsActions;

// ---------------------------------------------------------------------------
// MMKV storage key names
// ---------------------------------------------------------------------------

const KEYS = {
  THEME: "settings.theme",
  FONT_SIZE: "settings.fontSize",
  CHORD_SIZE: "settings.chordSize",
  CHORD_ORIENTATION: "settings.chordOrientation",
  CHORD_VISIBLE: "settings.chordVisible",
  IMAGE_SCHEME_SIZE: "settings.imageSchemeSize",
  IMAGE_SCHEME_VISIBLE: "settings.imageSchemeVisible",
  FAVORITES: "settings.favorites",
  PROGRESS: "settings.progress",
  HIDE_COMPLETED_LESSONS: "settings.hideCompletedLessons",
} as const;

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function tryParse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const VALID_THEMES = new Set<string>(Object.keys(THEME_DEFINITIONS));

function parseTheme(raw: string | undefined): ThemeName | undefined {
  return raw !== undefined && VALID_THEMES.has(raw) ? (raw as ThemeName) : undefined;
}

const VALID_SIZES = new Set<number>([1, 2, 3, 4, 5]);

function parseFontSize(raw: number | undefined): FontSize {
  return raw !== undefined && VALID_SIZES.has(raw) ? (raw as FontSize) : 3;
}

function parseDiagramSize(raw: number | undefined, fallback: DiagramSize): DiagramSize {
  return raw !== undefined && VALID_SIZES.has(raw) ? (raw as DiagramSize) : fallback;
}

const VALID_DIAGRAM_ORIENTATIONS = new Set<string>(["horizontal", "vertical"]);

function parseDiagramOrientation(raw: string | undefined): DiagramOrientation {
  return raw !== undefined && VALID_DIAGRAM_ORIENTATIONS.has(raw)
    ? (raw as DiagramOrientation)
    : "vertical";
}

// ---------------------------------------------------------------------------
// Initial data — reads synchronously from MMKV so the store is ready before
// the first React render (no startup flicker).
// ---------------------------------------------------------------------------

export function readDefaults(): SettingsData {
  return {
    theme: parseTheme(storage.getString(KEYS.THEME)),
    fontSize: parseFontSize(storage.getNumber(KEYS.FONT_SIZE)),
    chordSize: parseDiagramSize(storage.getNumber(KEYS.CHORD_SIZE), 3),
    chordOrientation: parseDiagramOrientation(
      storage.getString(KEYS.CHORD_ORIENTATION),
    ),
    chordVisible: storage.getBoolean(KEYS.CHORD_VISIBLE) ?? true,
    imageSchemeSize: parseDiagramSize(storage.getNumber(KEYS.IMAGE_SCHEME_SIZE), 3),
    imageSchemeVisible: storage.getBoolean(KEYS.IMAGE_SCHEME_VISIBLE) ?? true,
    favorites: tryParse<string[]>(storage.getString(KEYS.FAVORITES), []),
    progress: tryParse<Record<string, LessonProgress>>(
      storage.getString(KEYS.PROGRESS),
      {},
    ),
    hideCompletedLessons: storage.getBoolean(KEYS.HIDE_COMPLETED_LESSONS) ?? false,
  };
}

// ---------------------------------------------------------------------------
// Zustand store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...readDefaults(),

  // UI Preferences

  setTheme: (theme) => {
    storage.set(KEYS.THEME, theme);
    set({ theme });
  },

  setFontSize: (fontSize) => {
    storage.set(KEYS.FONT_SIZE, fontSize);
    set({ fontSize });
  },

  setChordSize: (chordSize) => {
    storage.set(KEYS.CHORD_SIZE, chordSize);
    set({ chordSize });
  },

  setChordOrientation: (chordOrientation) => {
    storage.set(KEYS.CHORD_ORIENTATION, chordOrientation);
    set({ chordOrientation });
  },

  setChordVisible: (chordVisible) => {
    storage.set(KEYS.CHORD_VISIBLE, chordVisible);
    set({ chordVisible });
  },

  setImageSchemeSize: (imageSchemeSize) => {
    storage.set(KEYS.IMAGE_SCHEME_SIZE, imageSchemeSize);
    set({ imageSchemeSize });
  },

  setImageSchemeVisible: (imageSchemeVisible) => {
    storage.set(KEYS.IMAGE_SCHEME_VISIBLE, imageSchemeVisible);
    set({ imageSchemeVisible });
  },

  // Content Interaction

  addFavorite: (uuid) => {
    const favorites = [...new Set([...get().favorites, uuid])];
    storage.set(KEYS.FAVORITES, JSON.stringify(favorites));
    set({ favorites });
  },

  removeFavorite: (uuid) => {
    const favorites = get().favorites.filter((f) => f !== uuid);
    storage.set(KEYS.FAVORITES, JSON.stringify(favorites));
    set({ favorites });
  },

  setVideoViewed: (lessonId, viewed) => {
    const currentProgress = get().progress;
    const existing = currentProgress[lessonId] ?? {
      videoViewed: false,
      completedSongIds: [],
    };
    const progress = {
      ...currentProgress,
      [lessonId]: { ...existing, videoViewed: viewed },
    };
    storage.set(KEYS.PROGRESS, JSON.stringify(progress));
    set({ progress });
  },

  setHideCompletedLessons: (hideCompletedLessons) => {
    storage.set(KEYS.HIDE_COMPLETED_LESSONS, hideCompletedLessons);
    set({ hideCompletedLessons });
  },

  setSongCompleted: (lessonId, songId, completed) => {
    const currentProgress = get().progress;
    const existing = currentProgress[lessonId] ?? {
      videoViewed: false,
      completedSongIds: [],
    };
    const completedSongIds = completed
      ? [...new Set([...existing.completedSongIds, songId])]
      : existing.completedSongIds.filter((id) => id !== songId);
    const progress = {
      ...currentProgress,
      [lessonId]: { ...existing, completedSongIds },
    };
    storage.set(KEYS.PROGRESS, JSON.stringify(progress));
    set({ progress });
  },
}));
