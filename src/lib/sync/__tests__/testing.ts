// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { syncStorage } from "../storage";
import { readDefaults, useSyncStore } from "../store";

export function resetSyncForTesting(): void {
  syncStorage.clearAll();
  useSyncStore.setState(readDefaults());
}
