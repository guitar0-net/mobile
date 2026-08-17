// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/lib/storage";

import { readDefaults, useActivityStatsStore } from "../stats-store";

export function resetActivityStatsForTesting(): void {
  storage.clearAll();
  useActivityStatsStore.setState(readDefaults());
}
