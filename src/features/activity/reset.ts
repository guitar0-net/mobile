// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { activityDaily, activityEvents, getDb } from "@/lib/db";
import { queryClient } from "@/lib/network/query-client";

export async function resetActivity(): Promise<void> {
  const db = getDb();
  await db.delete(activityEvents);
  await db.delete(activityDaily);
  await queryClient.invalidateQueries({ queryKey: ["activity"] });
}
