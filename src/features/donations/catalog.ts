// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { SymbolViewProps } from "expo-symbols";

export type DonationTier = {
  productId: string;
  label: string;
  icon: SymbolViewProps["name"];
};

// Product IDs must match exactly across three places: this list, the
// non-consumable SKUs created in App Store Connect / Google Play Console, and
// the DonationProduct rows in the Django admin — none of the three is the
// source of truth for the others.
export const DONATION_TIERS: readonly DonationTier[] = [
  {
    productId: "donation_thanks",
    label: "Сказать спасибо",
    icon: { ios: "heart.fill", android: "favorite" },
  },
  {
    productId: "donation_coffee",
    label: "Угостить кофе",
    icon: { ios: "cup.and.saucer.fill", android: "local_cafe" },
  },
  {
    productId: "donation_servers",
    label: "Оплатить сервера на месяц",
    icon: { ios: "server.rack", android: "dns" },
  },
  {
    productId: "donation_motivate",
    label: "Мотивировать на разработку",
    icon: { ios: "sparkles", android: "auto_awesome" },
  },
];

// Staff can deactivate a DonationProduct from the admin without an app
// release; a deactivated product_id just disappears from this list until
// reactivated, instead of the client trying to sell something the server
// will reject.
export function getVisibleTiers(activeProductIds: readonly string[]): DonationTier[] {
  const active = new Set(activeProductIds);
  return DONATION_TIERS.filter((tier) => active.has(tier.productId));
}
