// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useShallow } from "zustand/react/shallow";

import { useSettingsStore } from "./store";

export type {
  DiagramOrientation,
  DiagramSize,
  FontSize,
  LessonProgress,
  SettingsState,
} from "./store";

export function useThemePreference() {
  return useSettingsStore(
    useShallow((s) => ({
      themeMode: s.themeMode,
      highContrast: s.highContrast,
      setThemeMode: s.setThemeMode,
      setHighContrast: s.setHighContrast,
    })),
  );
}

export function useDiagramSettings() {
  return useSettingsStore(
    useShallow((s) => ({
      chordSize: s.chordSize,
      chordOrientation: s.chordOrientation,
      chordVisible: s.chordVisible,
      setChordSize: s.setChordSize,
      setChordOrientation: s.setChordOrientation,
      setChordVisible: s.setChordVisible,
      imageSchemeSize: s.imageSchemeSize,
      imageSchemeVisible: s.imageSchemeVisible,
      setImageSchemeSize: s.setImageSchemeSize,
      setImageSchemeVisible: s.setImageSchemeVisible,
    })),
  );
}

export function useFontSize() {
  return useSettingsStore(
    useShallow((s) => ({
      fontSize: s.fontSize,
      setFontSize: s.setFontSize,
    })),
  );
}

export function useFavorites() {
  return useSettingsStore(
    useShallow((s) => ({
      favorites: s.favorites,
      addFavorite: s.addFavorite,
      removeFavorite: s.removeFavorite,
    })),
  );
}

export function useProgress() {
  return useSettingsStore(
    useShallow((s) => ({
      progress: s.progress,
      setVideoViewed: s.setVideoViewed,
      setSongCompleted: s.setSongCompleted,
    })),
  );
}

export function useHideCompletedLessons() {
  return useSettingsStore(
    useShallow((s) => ({
      hideCompletedLessons: s.hideCompletedLessons,
      setHideCompletedLessons: s.setHideCompletedLessons,
    })),
  );
}
