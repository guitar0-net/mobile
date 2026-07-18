// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "../storage";
import { readDefaults, useSettingsStore } from "../store";

export function resetSettingsForTesting(): void {
  storage.clearAll();
  // wifiOnlyDownloads lives outside readDefaults() (see bottom of store.ts),
  // so setState's shallow merge won't clear it on its own — reset explicitly.
  useSettingsStore.setState({ ...readDefaults(), wifiOnlyDownloads: false });
}
