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
  },

  dark: {
    "--color-primary": "#9D4EDD",
    "--color-primary-fg": "#FFFFFF",
    "--color-background": "#09090B",
    "--color-surface": "#18181B",
    "--color-foreground": "#FAFAFA",
    "--color-muted-fg": "#A1A1AA",
    "--color-border": "#27272A",
    "--color-success": "#4ADE80",
    "--color-warning": "#FBBF24",
    "--color-destructive": "#F87171",
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
  },
};
