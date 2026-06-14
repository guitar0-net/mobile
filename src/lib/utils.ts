// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicts so the last class wins.
 * Wraps clsx (falsy filtering, conditional classes) + tailwind-merge (conflict resolution).
 *
 * @example
 * cn("text-sm", "text-lg")          // → "text-lg"
 * cn("bg-primary", isActive && "bg-surface") // last one wins
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Appends a two-digit hex alpha to a 6-digit hex color string.
export function withAlpha(hex: string, opacity: number): string {
  return (
    hex +
    Math.round(opacity * 255)
      .toString(16)
      .padStart(2, "0")
  );
}

export function pluralRu(
  n: number,
  form1: string,
  form2: string,
  form5: string,
): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} ${form5}`;
  if (mod10 === 1) return `${n} ${form1}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${form2}`;
  return `${n} ${form5}`;
}

export function describeRemainingItems(songs: number, videoRemaining: boolean): string {
  if (songs === 0 && !videoRemaining) return "";
  if (songs === 0) return "осталось видео";

  if (videoRemaining) {
    return `осталось видео и ${pluralRu(songs, "песня", "песни", "песен")}`;
  }

  const mod10 = songs % 10;
  const mod100 = songs % 100;
  if (mod100 >= 11 && mod100 <= 14) return `осталось ${songs} песен`;
  if (mod10 === 1) return `осталась ${songs} песня`;
  if (mod10 >= 2 && mod10 <= 4) return `остались ${songs} песни`;
  return `осталось ${songs} песен`;
}

export function formatDateRu(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTodayRu(date: Date = new Date()): string {
  const s = date.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^[-*_]{3,}$/gm, "")
    .replace(/\n{2,}/g, " ")
    .replace(/\n/g, " ")
    .trim();
}
