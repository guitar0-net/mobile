// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Purchase, UseIAPOptions } from "expo-iap";
import { ErrorCode, useIAP } from "expo-iap";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";

import { verifyPurchase } from "./api";
import { DonationIapProvider, useDonationIapSession } from "./donation-iap-provider";

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

const mockUseIAP = jest.mocked(useIAP);
const mockVerifyPurchase = jest.mocked(verifyPurchase);

function wrapper({ children }: { children: React.ReactNode }) {
  return <DonationIapProvider>{children}</DonationIapProvider>;
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

function disconnectedError() {
  return Object.assign(new Error("Billing client not ready"), {
    code: ErrorCode.NotPrepared,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIAP();
  mockVerifyPurchase.mockResolvedValue({
    platform: "android",
    product_id: "donation_thanks",
    status: "completed",
    verified_at: "2026-01-01T00:00:00Z",
  });
});

describe("DonationIapProvider", () => {
  test("settles a purchase the store still holds, without the donation screen", async () => {
    const purchase = makePurchase();
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    mockIAP({ availablePurchases: [purchase], finishTransaction });

    renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() =>
      expect(mockVerifyPurchase).toHaveBeenCalledWith(
        expect.objectContaining({ product_id: "donation_thanks" }),
      ),
    );
    expect(finishTransaction).toHaveBeenCalledWith({ purchase, isConsumable: false });
  });

  test("leaves purchases of products this build doesn't sell alone", async () => {
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    mockIAP({
      availablePurchases: [makePurchase({ productId: "premium2" })],
      finishTransaction,
    });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() => expect(result.current.connected).toBe(true));
    expect(mockVerifyPurchase).not.toHaveBeenCalled();
    expect(finishTransaction).not.toHaveBeenCalled();
    expect(result.current.ownedProductIds.has("premium2")).toBe(false);
  });

  test("re-checks the store's purchases when the app returns to the foreground", async () => {
    const handlers: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _event: string,
      handler: (state: AppStateStatus) => void,
    ) => {
      handlers.push(handler);
      return { remove: jest.fn() };
    }) as never);
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    mockIAP({ getAvailablePurchases });

    renderHook(() => useDonationIapSession(), { wrapper });
    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));

    await act(async () => {
      handlers.forEach((handler) => handler("active"));
    });

    expect(getAvailablePurchases).toHaveBeenCalledTimes(2);
  });

  test("does not re-check the store's purchases when the app goes to the background", async () => {
    const handlers: ((state: AppStateStatus) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _event: string,
      handler: (state: AppStateStatus) => void,
    ) => {
      handlers.push(handler);
      return { remove: jest.fn() };
    }) as never);
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    mockIAP({ getAvailablePurchases });

    renderHook(() => useDonationIapSession(), { wrapper });
    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));

    await act(async () => {
      handlers.forEach((handler) => handler("background"));
    });

    expect(getAvailablePurchases).toHaveBeenCalledTimes(1);
  });

  test("reconnects and retries a call the store refused after dropping the connection", async () => {
    const fetchProducts = jest
      .fn()
      .mockRejectedValueOnce(disconnectedError())
      .mockResolvedValue(undefined);
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ fetchProducts, reconnect });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => {
      await result.current.fetchPrices(["donation_thanks"]);
    });

    expect(reconnect).toHaveBeenCalledTimes(1);
    expect(fetchProducts).toHaveBeenCalledTimes(2);
    expect(result.current.storeError).toBe(false);
  });

  test("reports the store as unavailable when reconnecting after a drop fails", async () => {
    const fetchProducts = jest.fn().mockRejectedValue(disconnectedError());
    const reconnect = jest.fn().mockResolvedValue(false);
    mockIAP({ fetchProducts, reconnect });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => {
      await result.current.fetchPrices(["donation_thanks"]);
    });

    expect(fetchProducts).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.storeError).toBe(true));
  });

  test("does not reconnect on a failure that isn't a dropped connection", async () => {
    const fetchProducts = jest.fn().mockRejectedValue(new Error("network blip"));
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ fetchProducts, reconnect });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => {
      await result.current.fetchPrices(["donation_thanks"]);
    });

    expect(reconnect).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.storeError).toBe(true));
  });

  test("fails loudly when the session is used outside the provider", () => {
    expect(() => renderHook(() => useDonationIapSession())).toThrow(
      /DonationIapProvider/,
    );
  });
});
