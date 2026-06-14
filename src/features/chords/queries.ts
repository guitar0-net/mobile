// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { count } from "drizzle-orm";

import { chords, getDb } from "@/lib/db";

export async function fetchChordsCount(): Promise<number> {
  const result = await getDb().select({ count: count() }).from(chords);
  return result[0]?.count ?? 0;
}
