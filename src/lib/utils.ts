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

export function pluralSongs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} песен`;
  if (mod10 === 1) return `${n} песня`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} песни`;
  return `${n} песен`;
}

export function describeRemainingItems(songs: number, videoRemaining: boolean): string {
  if (songs === 0 && !videoRemaining) return "";
  if (songs === 0) return "осталось видео";

  const mod10 = songs % 10;
  const mod100 = songs % 100;

  if (videoRemaining) {
    let songPart: string;
    if (mod100 >= 11 && mod100 <= 14) songPart = `${songs} песен`;
    else if (mod10 === 1) songPart = `${songs} песня`;
    else if (mod10 >= 2 && mod10 <= 4) songPart = `${songs} песни`;
    else songPart = `${songs} песен`;
    return `осталось видео и ${songPart}`;
  }

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
