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
