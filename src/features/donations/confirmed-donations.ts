// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { confirmedDonations, initDb } from "@/lib/db";

/** Verified receipts, keyed by the store's transaction id and valued by product. */
export type ConfirmedDonations = ReadonlyMap<string, string>;

export async function loadConfirmedDonations(): Promise<ConfirmedDonations> {
  const db = await initDb();
  const rows = await db.select().from(confirmedDonations);
  return new Map(rows.map((row) => [row.storeTransactionId, row.productId]));
}

export async function saveConfirmedDonation(
  storeTransactionId: string,
  productId: string,
  verifiedAt: string,
): Promise<void> {
  const db = await initDb();
  await db
    .insert(confirmedDonations)
    .values({ storeTransactionId, productId, verifiedAt })
    .onConflictDoNothing();
}
