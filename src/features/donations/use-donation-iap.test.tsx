// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Purchase } from "expo-iap";
import { ErrorCode } from "expo-iap";
import React from "react";

import { ApiError } from "@/lib/network";
import { createTestQueryClient } from "@/lib/network/__tests__/testing";

import { mockIAP } from "./__tests__/fake-iap";
import { getActiveDonationProductIds, verifyPurchase } from "./api";
import { DonationIapProvider } from "./donation-iap-provider";
import { useDonationIap } from "./use-donation-iap";

jest.mock("expo-iap", () => ({
  // expo-iap's index initializes its native module and doesn't survive being
  // re-evaluated through requireActual, so ErrorCode comes from types instead.
  ErrorCode: jest.requireActual("expo-iap/build/types").ErrorCode,
  useIAP: jest.fn(),
}));
jest.mock("./api", () => ({
  getActiveDonationProductIds: jest.fn(),
  verifyPurchase: jest.fn(),
}));
jest.mock("@/lib/device-id", () => ({ getDeviceId: () => "device-abc" }));

const mockGetActiveDonationProductIds = jest.mocked(getActiveDonationProductIds);
const mockVerifyPurchase = jest.mocked(verifyPurchase);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = createTestQueryClient();
  return (
    <QueryClientProvider client={client}>
      <DonationIapProvider>{children}</DonationIapProvider>
    </QueryClientProvider>
  );
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: "purchase-id",
    productId: "tip_thanks",
    transactionId: "txn-123",
    purchaseToken: "opaque-token",
    ...overrides,
  } as Purchase;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActiveDonationProductIds.mockResolvedValue([]);
  mockIAP();
  mockVerifyPurchase.mockResolvedValue({
    platform: "ios",
    product_id: "tip_thanks",
    status: "completed",
    verified_at: "2026-01-01T00:00:00Z",
  });
});

describe("useDonationIap — tiers", () => {
  test("is loading while the active product ids are still resolving", () => {
    mockGetActiveDonationProductIds.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  test("is an error when the active product ids fail to load", async () => {
    mockGetActiveDonationProductIds.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(result.current.loadError).toBe("catalog"));
  });

  test("returns no tiers when nothing is active", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue([]);

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tiers).toEqual([]);
  });

  test("attaches the store's display price to a visible tier", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
    mockIAP({ products: [{ id: "tip_thanks", displayPrice: "$1.00" }] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() =>
      expect(result.current.tiers).toEqual([
        expect.objectContaining({
          productId: "tip_thanks",
          displayPrice: "$1.00",
        }),
      ]),
    );
  });

  test("drops a tier the store has no price for", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks", "tip_coffee"]);
    mockIAP({ products: [{ id: "tip_thanks", displayPrice: "$1.00" }] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tiers.map((tier) => tier.productId)).toEqual(["tip_thanks"]);
  });

  test("stops waiting when the store connection never comes up", async () => {
    jest.useFakeTimers();
    try {
      mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
      mockIAP({ connected: false });

      const { result } = renderHook(() => useDonationIap(), { wrapper });
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(10_000);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.loadError).toBe("store");
    } finally {
      jest.useRealTimers();
    }
  });

  test("refetch(): reconnects to the store when it never connected", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ connected: false, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(result.current.tiers).toEqual([]));

    act(() => result.current.refetch());

    expect(reconnect).toHaveBeenCalled();
  });

  test("refetch(): an empty catalog stays on the unavailable message instead of cycling back to the error", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue([]);
    const reconnect = jest.fn().mockResolvedValue(false);
    mockIAP({ connected: false, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.refetch());

    await waitFor(() => expect(reconnect).toHaveBeenCalled());
    expect(result.current.loadError).toBeNull();
    expect(result.current.tiers).toEqual([]);
  });

  test("refetch(): surfaces an error when reconnect reports failure by resolving false", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
    const reconnect = jest.fn().mockResolvedValue(false);
    mockIAP({ connected: false, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(mockGetActiveDonationProductIds).toHaveBeenCalled());

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.loadError).toBe("store"));
    expect(result.current.isLoading).toBe(false);
  });

  test("refetch(): surfaces an error when reconnect rejects outright", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
    const reconnect = jest.fn().mockRejectedValue(new Error("no billing service"));
    mockIAP({ connected: false, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(mockGetActiveDonationProductIds).toHaveBeenCalled());

    act(() => result.current.refetch());

    await waitFor(() => expect(result.current.loadError).toBe("store"));
  });

  test("refetch(): does not reconnect a store that is already connected", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ connected: true, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.refetch());

    expect(reconnect).not.toHaveBeenCalled();
  });

  test("clears a prior IAP error and retries fetchProducts when refetch is called", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
    const fetchProducts = jest
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValue(undefined);
    mockIAP({ fetchProducts });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(result.current.loadError).toBe("store"));

    fetchProducts.mockClear();
    act(() => result.current.refetch());

    expect(result.current.loadError).toBeNull();
    expect(fetchProducts).toHaveBeenCalledWith({
      skus: ["tip_thanks"],
      type: "in-app",
    });
  });

  test("does not leak an unhandled rejection when the store refuses its requests", async () => {
    const rejections: unknown[] = [];
    const record = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", record);
    try {
      mockGetActiveDonationProductIds.mockResolvedValue(["tip_thanks"]);
      const notConnected = () =>
        Promise.reject(new Error("Play Store service is not connected"));
      mockIAP({
        fetchProducts: jest.fn(notConnected),
        getAvailablePurchases: jest.fn(notConnected),
      });

      const { result } = renderHook(() => useDonationIap(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      await act(async () => {
        await new Promise<void>((resolve) => setImmediate(() => resolve()));
      });

      expect(rejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", record);
    }
  });
});

describe("useDonationIap — purchase", () => {
  test("surfaces an error message when the purchase request never reaches the store", async () => {
    const requestPurchase = jest.fn().mockRejectedValue(new Error("not connected yet"));
    mockIAP({ requestPurchase });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => result.current.purchase("tip_thanks"));

    await waitFor(() => expect(result.current.purchasingProductId).toBeNull());
    expect(result.current.errorMessage).toBe(
      "Не удалось совершить покупку. Попробуйте ещё раз",
    );
  });

  test("verifies and consumes a purchase reported via onPurchaseSuccess, then thanks the donor", async () => {
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    const { getOptions } = mockIAP({ finishTransaction });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    const purchase = makePurchase();

    act(() => getOptions().onPurchaseSuccess?.(purchase));

    await waitFor(() =>
      expect(result.current.thanks).toEqual({
        productId: "tip_thanks",
        transactionId: "txn-123",
      }),
    );
    expect(mockVerifyPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "tip_thanks",
        device_id: "device-abc",
      }),
    );
    expect(finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: true });
  });

  test("sets an inline error when server verification fails after a successful store purchase", async () => {
    mockVerifyPurchase.mockRejectedValue(new Error("boom"));
    const { getOptions } = mockIAP();

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => getOptions().onPurchaseSuccess?.(makePurchase()));

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "Не удалось подтвердить покупку. Проверьте подключение к интернету",
      ),
    );
  });

  test("clears a prior verification error once a later reconcile of the same purchase succeeds", async () => {
    mockVerifyPurchase.mockRejectedValueOnce(new Error("boom"));
    const { getOptions } = mockIAP();
    const purchase = makePurchase();

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => getOptions().onPurchaseSuccess?.(purchase));
    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());

    act(() => getOptions().onPurchaseSuccess?.(purchase));

    await waitFor(() => expect(result.current.thanks).not.toBeNull());
    expect(result.current.errorMessage).toBeNull();
  });

  test("maps a store-reported purchase error via describePurchaseError", async () => {
    const { getOptions } = mockIAP();

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() =>
      getOptions().onPurchaseError?.({
        code: ErrorCode.AlreadyOwned,
        message: "already owned",
      } as never),
    );

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "Предыдущая покупка ещё не завершена. Попробуйте через минуту",
      ),
    );
    expect(result.current.purchasingProductId).toBeNull();
  });

  test("finishes a permanently rejected transaction so the store stops replaying it", async () => {
    mockVerifyPurchase.mockRejectedValue(new ApiError(422, "Invalid receipt."));
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    const { getOptions } = mockIAP({ finishTransaction });
    const purchase = makePurchase();

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => getOptions().onPurchaseSuccess?.(purchase));

    await waitFor(() =>
      expect(finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: true }),
    );
    expect(result.current.errorMessage).toBe("Не удалось подтвердить покупку");
  });

  test("leaves a transiently failed transaction unfinished so it can be retried", async () => {
    mockVerifyPurchase.mockRejectedValue(new ApiError(502));
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    const { getOptions } = mockIAP({ finishTransaction });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => getOptions().onPurchaseSuccess?.(makePurchase()));

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    expect(finishTransaction).not.toHaveBeenCalled();
  });

  test("does not report a store that refuses to finish as a verification failure", async () => {
    const finishTransaction = jest
      .fn()
      .mockRejectedValue(new Error("already finished"));
    const { getOptions } = mockIAP({ finishTransaction });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => getOptions().onPurchaseSuccess?.(makePurchase()));

    await waitFor(() => expect(finishTransaction).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.errorMessage).toBeNull();
  });

  test("stays quiet when reconciling a purchase the user didn't just make fails", async () => {
    mockVerifyPurchase.mockRejectedValue(new Error("offline"));
    mockIAP({ availablePurchases: [makePurchase()] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(mockVerifyPurchase).toHaveBeenCalled());
    expect(result.current.errorMessage).toBeNull();
  });

  test("verifies a purchase the store still holds once, not again on every store refresh", async () => {
    mockIAP({ availablePurchases: [makePurchase()] });

    const { rerender } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(mockVerifyPurchase).toHaveBeenCalledTimes(1));

    mockIAP({ availablePurchases: [makePurchase()] });
    rerender(undefined);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockVerifyPurchase).toHaveBeenCalledTimes(1);
  });

  test("confirms purchases the store already knows about", async () => {
    mockIAP({ availablePurchases: [makePurchase({ productId: "tip_coffee" })] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(result.current.thanks?.productId).toBe("tip_coffee"));
    expect(result.current.purchaseStates.has("tip_coffee")).toBe(false);
  });

  test("does not check existing purchases until the store connection is ready", async () => {
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    mockIAP({ connected: false, getAvailablePurchases });

    const { rerender } = renderHook(() => useDonationIap(), { wrapper });
    expect(getAvailablePurchases).not.toHaveBeenCalled();

    mockIAP({ connected: true, getAvailablePurchases });
    rerender(undefined);

    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));
  });
});
