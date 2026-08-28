// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Purchase, UseIAPOptions } from "expo-iap";
import { ErrorCode, useIAP } from "expo-iap";
import React from "react";

import { ApiError } from "@/lib/network";

import { getActiveDonationProductIds, verifyPurchase } from "./api";
import { useDonationIap } from "./use-donation-iap";

jest.mock("expo-iap", () => ({
  // Pull ErrorCode from the plain-data types module rather than the full
  // "expo-iap" index — the index's native-module init graph doesn't survive
  // being re-evaluated through requireActual inside a mock factory.
  ErrorCode: jest.requireActual("expo-iap/build/types").ErrorCode,
  useIAP: jest.fn(),
}));
jest.mock("./api", () => ({
  getActiveDonationProductIds: jest.fn(),
  verifyPurchase: jest.fn(),
}));
jest.mock("@/lib/device-id", () => ({ getDeviceId: () => "device-abc" }));

const mockUseIAP = jest.mocked(useIAP);
const mockGetActiveDonationProductIds = jest.mocked(getActiveDonationProductIds);
const mockVerifyPurchase = jest.mocked(verifyPurchase);

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: "purchase-id",
    productId: "donation_thanks",
    transactionId: "txn-123",
    purchaseToken: "opaque-token",
    ...overrides,
  } as Purchase;
}

type IAPMock = {
  connected: boolean;
  products: { id: string; displayPrice: string }[];
  fetchProducts: jest.Mock;
  availablePurchases: Purchase[];
  getAvailablePurchases: jest.Mock;
  requestPurchase: jest.Mock;
  finishTransaction: jest.Mock;
  restorePurchases: jest.Mock;
  reconnect: jest.Mock;
};

function mockIAP(overrides: Partial<IAPMock> = {}) {
  let capturedOptions: UseIAPOptions | undefined;
  const base: IAPMock = {
    connected: true,
    products: [],
    fetchProducts: jest.fn().mockResolvedValue(undefined),
    availablePurchases: [],
    getAvailablePurchases: jest.fn().mockResolvedValue(undefined),
    requestPurchase: jest.fn().mockResolvedValue(undefined),
    finishTransaction: jest.fn().mockResolvedValue(undefined),
    restorePurchases: jest.fn().mockResolvedValue(undefined),
    reconnect: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  mockUseIAP.mockImplementation((options) => {
    capturedOptions = options;
    return base as unknown as ReturnType<typeof useIAP>;
  });
  return { ...base, getOptions: () => capturedOptions! };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActiveDonationProductIds.mockResolvedValue([]);
  mockIAP();
  mockVerifyPurchase.mockResolvedValue({
    platform: "ios",
    product_id: "donation_thanks",
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

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  test("returns no tiers when nothing is active", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue([]);

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tiers).toEqual([]);
  });

  test("attaches the store's display price to a visible tier", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["donation_thanks"]);
    mockIAP({ products: [{ id: "donation_thanks", displayPrice: "$1.00" }] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() =>
      expect(result.current.tiers).toEqual([
        expect.objectContaining({
          productId: "donation_thanks",
          displayPrice: "$1.00",
        }),
      ]),
    );
  });

  test("drops a tier the store has no price for", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue([
      "donation_thanks",
      "donation_coffee",
    ]);
    mockIAP({ products: [{ id: "donation_thanks", displayPrice: "$1.00" }] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.tiers.map((tier) => tier.productId)).toEqual([
      "donation_thanks",
    ]);
  });

  test("stops waiting when the store connection never comes up", async () => {
    jest.useFakeTimers();
    try {
      mockGetActiveDonationProductIds.mockResolvedValue(["donation_thanks"]);
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
      expect(result.current.isError).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  test("refetch(): reconnects to the store when it never connected", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["donation_thanks"]);
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ connected: false, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(result.current.tiers).toEqual([]));

    act(() => result.current.refetch());

    expect(reconnect).toHaveBeenCalled();
  });

  test("refetch(): does not reconnect a store that is already connected", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["donation_thanks"]);
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ connected: true, reconnect });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.refetch());

    expect(reconnect).not.toHaveBeenCalled();
  });

  test("clears a prior IAP error and retries fetchProducts when refetch is called", async () => {
    mockGetActiveDonationProductIds.mockResolvedValue(["donation_thanks"]);
    const fetchProducts = jest.fn().mockResolvedValue(undefined);
    const { getOptions } = mockIAP({ fetchProducts });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(fetchProducts).toHaveBeenCalledTimes(1));

    act(() => getOptions().onError?.(new Error("network blip")));
    expect(result.current.isError).toBe(true);

    fetchProducts.mockClear();
    act(() => result.current.refetch());

    expect(result.current.isError).toBe(false);
    expect(fetchProducts).toHaveBeenCalledWith({
      skus: ["donation_thanks"],
      type: "in-app",
    });
  });

  test("does not leak an unhandled rejection when the store refuses its requests", async () => {
    const rejections: unknown[] = [];
    const record = (reason: unknown) => rejections.push(reason);
    process.on("unhandledRejection", record);
    try {
      mockGetActiveDonationProductIds.mockResolvedValue(["donation_thanks"]);
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

    act(() => result.current.purchase("donation_thanks"));

    await waitFor(() => expect(result.current.purchasingProductId).toBeNull());
    expect(result.current.errorMessage).toBe(
      "Не удалось совершить покупку. Попробуйте ещё раз",
    );
  });

  test("verifies and finishes a purchase reported via onPurchaseSuccess, marking it owned", async () => {
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    const { getOptions } = mockIAP({ finishTransaction });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    const purchase = makePurchase();

    act(() => getOptions().onPurchaseSuccess?.(purchase));

    await waitFor(() => expect(result.current.ownedProductIds.has("donation_thanks")));
    expect(mockVerifyPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: "donation_thanks",
        device_id: "device-abc",
      }),
    );
    expect(finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
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

    await waitFor(() =>
      expect(result.current.ownedProductIds.has("donation_thanks")).toBe(true),
    );
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
        "Вы уже подарили этот вариант поддержки",
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
      expect(finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false }),
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

    await waitFor(() =>
      expect(result.current.ownedProductIds.has("donation_thanks")).toBe(true),
    );
    expect(result.current.errorMessage).toBeNull();
  });

  test("stays quiet when reconciling a purchase the user didn't just make fails", async () => {
    mockVerifyPurchase.mockRejectedValue(new Error("offline"));
    mockIAP({ availablePurchases: [makePurchase()] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() => expect(mockVerifyPurchase).toHaveBeenCalled());
    expect(result.current.errorMessage).toBeNull();
  });

  test("verifies a restored purchase once, not again on every store refresh", async () => {
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

  test("merges purchases the store already knows about into ownedProductIds", async () => {
    mockIAP({ availablePurchases: [makePurchase({ productId: "donation_coffee" })] });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    await waitFor(() =>
      expect(result.current.ownedProductIds.has("donation_coffee")).toBe(true),
    );
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

  test("restore(): calls restorePurchases without a redundant getAvailablePurchases round-trip, then clears isRestoring", async () => {
    const restorePurchases = jest.fn().mockResolvedValue(undefined);
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    mockIAP({ restorePurchases, getAvailablePurchases });

    const { result } = renderHook(() => useDonationIap(), { wrapper });
    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));
    getAvailablePurchases.mockClear();

    act(() => result.current.restore());
    expect(result.current.isRestoring).toBe(true);

    await waitFor(() => expect(result.current.isRestoring).toBe(false));
    expect(restorePurchases).toHaveBeenCalled();
    expect(getAvailablePurchases).not.toHaveBeenCalled();
  });

  test("restore(): ignores a second call while one is still running", async () => {
    let finishRestore = () => {};
    const restorePurchases = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRestore = resolve;
        }),
    );
    mockIAP({ restorePurchases });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => result.current.restore());
    act(() => result.current.restore());

    expect(restorePurchases).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishRestore();
    });
    expect(result.current.isRestoring).toBe(false);
  });

  test("restore(): sets an error message when restorePurchases rejects", async () => {
    const restorePurchases = jest.fn().mockRejectedValue(new Error("offline"));
    mockIAP({ restorePurchases });

    const { result } = renderHook(() => useDonationIap(), { wrapper });

    act(() => result.current.restore());

    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "Не удалось восстановить покупки. Проверьте подключение к интернету",
      ),
    );
    expect(result.current.isRestoring).toBe(false);
  });
});
