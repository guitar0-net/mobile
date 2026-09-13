// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

export type ThemeTokens = {
  "--color-primary": string;
  "--color-primary-fg": string;
  "--color-background": string;
  "--color-surface": string;
  "--color-foreground": string;
  "--color-muted-fg": string;
  "--color-border": string;
  "--color-success": string;
  "--color-warning": string;
  "--color-destructive": string;
  "--color-brand-red": string;
  "--color-brand-amber": string;
  "--color-brand-brown": string;
  "--color-switch-thumb": string;
};

export type ThemeName = "light" | "dark" | "contrast-light" | "contrast-dark";

export const THEME_DEFINITIONS: Record<ThemeName, ThemeTokens> = {
  light: {
    "--color-primary": "#7B2FBE",
    "--color-primary-fg": "#FFFFFF",
    "--color-background": "#FFFFFF",
    "--color-surface": "#F4F4F5",
    "--color-foreground": "#09090B",
    "--color-muted-fg": "#71717A",
    "--color-border": "#E4E4E7",
    "--color-success": "#22C55E",
    "--color-warning": "#F59E0B",
    "--color-destructive": "#EF4444",
    "--color-brand-red": "#C94040",
    "--color-brand-amber": "#D49A12",
    "--color-brand-brown": "#7C4030",
    "--color-switch-thumb": "#FFFFFF",
  },

  dark: {
    "--color-primary": "#8B44D4",
    "--color-primary-fg": "#FFFFFF",
    "--color-background": "#09090B",
    "--color-surface": "#18181B",
    "--color-foreground": "#FAFAFA",
    "--color-muted-fg": "#A1A1AA",
    "--color-border": "#27272A",
    "--color-success": "#4ADE80",
    "--color-warning": "#FBBF24",
    "--color-destructive": "#F87171",
    "--color-brand-red": "#E05252",
    "--color-brand-amber": "#E8AE20",
    "--color-brand-brown": "#A05540",
    "--color-switch-thumb": "#FFFFFF",
  },

  "contrast-light": {
    "--color-primary": "#000000",
    "--color-primary-fg": "#FFFFFF",
    "--color-background": "#FFFFFF",
    "--color-surface": "#FFFFFF",
    "--color-foreground": "#000000",
    "--color-muted-fg": "#000000",
    "--color-border": "#000000",
    "--color-success": "#166534",
    "--color-warning": "#92400E",
    "--color-destructive": "#991B1B",
    "--color-brand-red": "#000000",
    "--color-brand-amber": "#000000",
    "--color-brand-brown": "#000000",
    "--color-switch-thumb": "#767676",
  },

  "contrast-dark": {
    "--color-primary": "#FFFFFF",
    "--color-primary-fg": "#000000",
    "--color-background": "#000000",
    "--color-surface": "#000000",
    "--color-foreground": "#FFFFFF",
    "--color-muted-fg": "#FFFFFF",
    "--color-border": "#FFFFFF",
    "--color-success": "#86EFAC",
    "--color-warning": "#FCD34D",
    "--color-destructive": "#FCA5A5",
    "--color-brand-red": "#FFFFFF",
    "--color-brand-amber": "#FFFFFF",
    "--color-brand-brown": "#FFFFFF",
    "--color-switch-thumb": "#767676",
  },
};
