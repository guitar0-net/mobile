// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useAppSession } from "../use-app-session";

export function ActivitySessionTracker() {
  useAppSession();
  return null;
}
