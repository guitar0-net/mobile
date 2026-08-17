// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { DONATION_TIERS, getVisibleTiers } from "./catalog";

describe("getVisibleTiers", () => {
  test("returns only tiers whose product_id is in the active list", () => {
    const visible = getVisibleTiers(["donation_thanks", "donation_servers"]);

    expect(visible.map((tier) => tier.productId)).toEqual([
      "donation_thanks",
      "donation_servers",
    ]);
  });

  test("returns an empty list when nothing is active", () => {
    expect(getVisibleTiers([])).toEqual([]);
  });

  test("ignores active ids the client doesn't recognize", () => {
    const visible = getVisibleTiers(["donation_thanks", "some_future_tier"]);

    expect(visible.map((tier) => tier.productId)).toEqual(["donation_thanks"]);
  });

  test("preserves the client's own display order regardless of server order", () => {
    const reversed = [...DONATION_TIERS].reverse().map((tier) => tier.productId);

    const visible = getVisibleTiers(reversed);

    expect(visible.map((tier) => tier.productId)).toEqual(
      DONATION_TIERS.map((tier) => tier.productId),
    );
  });
});
