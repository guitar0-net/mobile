// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { apiFetch, apiPostJson } from "@/lib/network";

import type { PurchaseVerifyRequest } from "./verify-payload";

// Hand-written because the OpenAPI schema behind api.types.ts doesn't cover
// donations yet — replace with the generated types once it does.
type DonationProductListResponse = {
  next: string | null;
  results: { product_id: string }[];
};

type PurchaseVerifyResponse = {
  platform: "android" | "ios";
  product_id: string;
  status: string;
  verified_at: string;
};

const PAGE_SIZE = 50;

// Guards against a `next` that never goes null: the catalog is a handful of
// tiers, so anything past this page is a broken cursor, not more products.
const MAX_PAGES = 5;

export async function getActiveDonationProductIds(): Promise<string[]> {
  const productIds: string[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await apiFetch<DonationProductListResponse>(
      `/api/v1/donations/products/?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    productIds.push(...response.results.map((product) => product.product_id));
    if (response.next === null || response.results.length === 0) break;
    // The server may cap a page below the requested limit, so advance by the
    // rows it actually returned.
    offset += response.results.length;
  }
  return productIds;
}

export async function verifyPurchase(
  payload: PurchaseVerifyRequest,
): Promise<PurchaseVerifyResponse> {
  return apiPostJson<PurchaseVerifyResponse>("/api/v1/donations/verify/", payload);
}
