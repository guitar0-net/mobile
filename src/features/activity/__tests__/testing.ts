// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readDefaults, useActivityStatsStore } from "../stats-store";
import { storage } from "../storage";

export function resetActivityStatsForTesting(): void {
  storage.clearAll();
  useActivityStatsStore.setState(readDefaults());
}
