// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { _resetDbForTesting } from "@/lib/db";

export function resetDbForTesting(): void {
  _resetDbForTesting();
}
