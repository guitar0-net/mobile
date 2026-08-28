// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Purchase } from "expo-iap";

import { buildVerifyPayload } from "./verify-payload";

function makePurchase(overrides: Partial<Purchase>): Purchase {
  return {
    id: "fallback-id",
    productId: "donation_thanks",
    transactionId: "txn-123",
    purchaseToken: "opaque-token",
    ...overrides,
  } as Purchase;
}

describe("buildVerifyPayload", () => {
  test("routes purchaseToken to purchase_token for Android", () => {
    const payload = buildVerifyPayload(makePurchase({}), "android", "device-abc");

    expect(payload).toEqual({
      platform: "android",
      product_id: "donation_thanks",
      store_transaction_id: "txn-123",
      purchase_token: "opaque-token",
      signed_transaction_info: "",
      device_id: "device-abc",
    });
  });

  test("routes purchaseToken to signed_transaction_info for iOS", () => {
    const payload = buildVerifyPayload(makePurchase({}), "ios", "device-abc");

    expect(payload).toEqual({
      platform: "ios",
      product_id: "donation_thanks",
      store_transaction_id: "txn-123",
      purchase_token: "",
      signed_transaction_info: "opaque-token",
      device_id: "device-abc",
    });
  });

  test("falls back to purchase.id when transactionId is absent", () => {
    const payload = buildVerifyPayload(
      makePurchase({ transactionId: null }),
      "android",
      "device-abc",
    );

    expect(payload.store_transaction_id).toBe("fallback-id");
  });

  test("sends an empty string, never undefined, when purchaseToken is missing", () => {
    const payload = buildVerifyPayload(
      makePurchase({ purchaseToken: null }),
      "ios",
      "device-abc",
    );

    expect(payload.signed_transaction_info).toBe("");
  });
});
