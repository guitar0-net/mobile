// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { create } from "zustand";

type ActiveDownload = {
  progress: number;
  cancel: () => Promise<void>;
};

type DownloadStoreState = {
  activeDownloads: Record<string, ActiveDownload>;
  stalledDownloads: Record<string, boolean>;
  setActive: (lessonId: string, entry: ActiveDownload) => void;
  updateProgress: (lessonId: string, progress: number) => void;
  clearActive: (lessonId: string) => void;
  setStalled: (lessonId: string, stalled: boolean) => void;
};

export const useDownloadStore = create<DownloadStoreState>((set) => ({
  activeDownloads: {},
  stalledDownloads: {},

  setActive: (lessonId, entry) =>
    set((state) => ({
      activeDownloads: { ...state.activeDownloads, [lessonId]: entry },
    })),

  updateProgress: (lessonId, progress) =>
    set((state) => {
      const existing = state.activeDownloads[lessonId];
      if (!existing) return state;
      return {
        activeDownloads: {
          ...state.activeDownloads,
          [lessonId]: { ...existing, progress },
        },
      };
    }),

  clearActive: (lessonId) =>
    set((state) => {
      const next = { ...state.activeDownloads };
      delete next[lessonId];
      return { activeDownloads: next };
    }),

  setStalled: (lessonId, stalled) =>
    set((state) => ({
      stalledDownloads: { ...state.stalledDownloads, [lessonId]: stalled },
    })),
}));
