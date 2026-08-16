// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getActiveDonationProductIds, verifyPurchase } from "./api";
import type { PurchaseVerifyRequest } from "./verify-payload";

const BASE_URL = "https://test.example.com";

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = BASE_URL;
  jest.spyOn(globalThis, "fetch").mockReset();
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

describe("getActiveDonationProductIds", () => {
  test("fetches the donation products endpoint", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ count: 0, next: null, previous: null, results: [] }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await getActiveDonationProductIds();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/donations/products/?limit=50&offset=0`,
    );
  });

  test("follows pagination instead of dropping products past the first page", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            next: `${BASE_URL}/api/v1/donations/products/?limit=50&offset=50`,
            results: [{ product_id: "donation_thanks" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ next: null, results: [{ product_id: "donation_coffee" }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const ids = await getActiveDonationProductIds();

    expect(ids).toEqual(["donation_thanks", "donation_coffee"]);
    // Offset advances by the one row the first page actually returned, not by
    // the requested limit of 50.
    expect(globalThis.fetch).toHaveBeenLastCalledWith(
      `${BASE_URL}/api/v1/donations/products/?limit=50&offset=1`,
    );
  });

  test("stops paginating instead of following a `next` that never goes null", async () => {
    jest.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            next: `${BASE_URL}/api/v1/donations/products/?limit=50&offset=1`,
            results: [{ product_id: "donation_thanks" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const ids = await getActiveDonationProductIds();

    expect(globalThis.fetch).toHaveBeenCalledTimes(5);
    expect(ids).toHaveLength(5);
  });

  test("returns the product_id of each active product", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          count: 2,
          next: null,
          previous: null,
          results: [
            { product_id: "donation_thanks" },
            { product_id: "donation_coffee" },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const ids = await getActiveDonationProductIds();

    expect(ids).toEqual(["donation_thanks", "donation_coffee"]);
  });

  test("throws on a non-OK HTTP response", async () => {
    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(getActiveDonationProductIds()).rejects.toThrow("HTTP error: 500");
  });
});

describe("verifyPurchase", () => {
  const payload: PurchaseVerifyRequest = {
    platform: "ios",
    product_id: "donation_thanks",
    store_transaction_id: "txn-123",
    purchase_token: "",
    signed_transaction_info: "jws-blob",
    device_id: "device-abc",
  };

  test("posts the payload to the verify endpoint", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          platform: "ios",
          product_id: "donation_thanks",
          status: "completed",
          verified_at: "2026-01-01T00:00:00Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await verifyPurchase(payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/donations/verify/`,
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
  });

  test("returns the verified purchase", async () => {
    const response = {
      platform: "ios" as const,
      product_id: "donation_thanks",
      status: "completed",
      verified_at: "2026-01-01T00:00:00Z",
    };
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(verifyPurchase(payload)).resolves.toEqual(response);
  });

  test("rejects with an ApiError on a non-OK response", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Unknown product_id." }), {
        status: 400,
      }),
    );

    await expect(verifyPurchase(payload)).rejects.toThrow("Unknown product_id.");
  });
});
