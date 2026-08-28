// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Purchase } from "expo-iap";

export type DonationPlatform = "android" | "ios";

export type PurchaseVerifyRequest = {
  platform: DonationPlatform;
  product_id: string;
  store_transaction_id: string;
  purchase_token: string;
  signed_transaction_info: string;
  device_id: string;
};

// expo-iap reports both stores' proof of purchase through one `purchaseToken`
// field (a StoreKit JWS on iOS, a Play Billing token on Android), while the
// server expects each in a field of its own.
export function buildVerifyPayload(
  purchase: Purchase,
  platform: DonationPlatform,
  deviceId: string,
): PurchaseVerifyRequest {
  return {
    platform,
    product_id: purchase.productId,
    store_transaction_id: purchase.transactionId ?? purchase.id,
    purchase_token: platform === "android" ? (purchase.purchaseToken ?? "") : "",
    signed_transaction_info: platform === "ios" ? (purchase.purchaseToken ?? "") : "",
    device_id: deviceId,
  };
}
