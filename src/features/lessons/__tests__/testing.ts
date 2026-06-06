// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting } from "@/lib/db";

/**
 * Resets the database singleton between tests so each test starts with a
 * fresh in-memory database. Call in `beforeEach`.
 */
export function resetDbForTesting(): void {
  _resetDbForTesting();
}
