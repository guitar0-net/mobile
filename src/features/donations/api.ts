// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { apiFetch, apiPostJson } from "@/lib/network";

import type { PurchaseVerifyRequest } from "./verify-payload";

// Hand-written response shapes: donations isn't deployed yet, so the OpenAPI
// schema api.types.ts is generated from doesn't know about it. Replace with
// the generated components["schemas"][...] types once `npm run generate:types`
// picks it up.
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

// The catalog is a handful of tiers, so a response still promising more pages
// past this point is a broken or hostile cursor rather than a real catalog.
// Without the cap, a `next` that never goes null makes the client request
// pages forever, on a mobile connection, behind two react-query retries.
const MAX_PAGES = 5;

// Walks the pages instead of trusting one request to hold every product:
// a tier missing from the response is a tier the app silently stops offering,
// which is the one failure mode worth a second round-trip to rule out.
export async function getActiveDonationProductIds(): Promise<string[]> {
  const productIds: string[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await apiFetch<DonationProductListResponse>(
      `/api/v1/donations/products/?limit=${PAGE_SIZE}&offset=${offset}`,
    );
    productIds.push(...response.results.map((product) => product.product_id));
    if (response.next === null || response.results.length === 0) break;
    // Advance by what the server actually returned rather than by the limit we
    // asked for — a smaller server-side page cap would otherwise skip rows.
    offset += response.results.length;
  }
  return productIds;
}

export async function verifyPurchase(
  payload: PurchaseVerifyRequest,
): Promise<PurchaseVerifyResponse> {
  return apiPostJson<PurchaseVerifyResponse>("/api/v1/donations/verify/", payload);
}
