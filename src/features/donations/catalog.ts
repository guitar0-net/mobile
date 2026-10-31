// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { SymbolViewProps } from "expo-symbols";

export type DonationTier = {
  productId: string;
  label: string;
  icon: SymbolViewProps["name"];
  thanks: string;
};

// Product IDs must match exactly in three places with no single source of
// truth: this list, the consumable SKUs in App Store Connect / Google Play
// Console, and the DonationProduct rows in the Django admin. An ID retired
// from App Store Connect can never be reused.
export const DONATION_TIERS: readonly DonationTier[] = [
  {
    productId: "tip_thanks",
    label: "Сказать спасибо",
    icon: { ios: "heart.fill", android: "favorite" },
    thanks: "Это правда очень приятно",
  },
  {
    productId: "tip_coffee",
    label: "Угостить кофе",
    icon: { ios: "cup.and.saucer.fill", android: "local_cafe" },
    thanks: "Самый вкусный кофе — подаренный",
  },
  {
    productId: "tip_servers",
    label: "Оплатить сервера на месяц",
    icon: { ios: "server.rack", android: "dns" },
    thanks: "Серверы оплачены ещё на месяц",
  },
  {
    productId: "tip_motivate",
    label: "Мотивировать на разработку",
    icon: { ios: "sparkles", android: "auto_awesome" },
    thanks: "Теперь точно есть ради кого стараться",
  },
];

const DONATION_PRODUCT_IDS = new Set(DONATION_TIERS.map((tier) => tier.productId));

export function isDonationProduct(productId: string): boolean {
  return DONATION_PRODUCT_IDS.has(productId);
}

export function getVisibleTiers(activeProductIds: readonly string[]): DonationTier[] {
  const active = new Set(activeProductIds);
  return DONATION_TIERS.filter((tier) => active.has(tier.productId));
}
