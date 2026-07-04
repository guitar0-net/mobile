// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/features/settings/storage";
import { _resetDbForTesting } from "@/lib/db";

import { KEYS, PRINT_DEFAULTS, usePrintSettingsStore } from "../print-settings-store";

export function resetDbForTesting(): void {
  _resetDbForTesting();
}

export function resetPrintSettingsForTesting(): void {
  Object.values(KEYS).forEach((key) => storage.remove(key));
  usePrintSettingsStore.setState(PRINT_DEFAULTS);
}
