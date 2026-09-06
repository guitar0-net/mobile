// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Purchase, UseIAPOptions } from "expo-iap";
import { ErrorCode, useIAP } from "expo-iap";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";

import { ApiError } from "@/lib/network";

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

// expo-iap reports every failed store call to onError *and* rejects, so a mock
// that only rejects hides whatever the provider does in onError.
const REPORTED_TO_ON_ERROR = [
  "fetchProducts",
  "getAvailablePurchases",
  "restorePurchases",
  "reconnect",
] as const;

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
  const session = { ...base };
  for (const name of REPORTED_TO_ON_ERROR) {
    const call = base[name];
    session[name] = jest.fn((...args: unknown[]) =>
      call(...args).catch((error: unknown) => {
        capturedOptions?.onError?.(error as Error);
        throw error;
      }),
    );
  }
  mockUseIAP.mockImplementation((options) => {
    capturedOptions = options;
    return session as unknown as ReturnType<typeof useIAP>;
  });
  return {
    ...base,
    getOptions: () => capturedOptions!,
    update: (patch: Partial<IAPMock>) => Object.assign(session, patch),
  };
}

function disconnectedError() {
  return Object.assign(new Error("Billing client not ready"), {
    code: ErrorCode.NotPrepared,
  });
}

function captureAppStateHandlers() {
  const handlers: ((state: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation(((
    _event: string,
    handler: (state: AppStateStatus) => void,
  ) => {
    handlers.push(handler);
    return { remove: jest.fn() };
  }) as never);
  return (state: AppStateStatus) => handlers.forEach((handler) => handler(state));
}

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockIAP();
  mockVerifyPurchase.mockResolvedValue({
    platform: "android",
    product_id: "donation_thanks",
    status: "completed",
    verified_at: "2026-01-01T00:00:00Z",
  });
});

afterEach(() => {
  jest.useRealTimers();
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

  test("clears the verification error once a background check confirms the purchase", async () => {
    const purchase = makePurchase();
    mockVerifyPurchase.mockRejectedValueOnce(new Error("offline"));
    const { getOptions, update } = mockIAP();

    const { result, rerender } = renderHook(() => useDonationIapSession(), {
      wrapper,
    });

    await act(async () => getOptions().onPurchaseSuccess?.(purchase));
    await waitFor(() =>
      expect(result.current.errorMessage).toBe(
        "Не удалось подтвердить покупку. Проверьте подключение к интернету",
      ),
    );

    await act(async () => {
      update({ availablePurchases: [purchase] });
      rerender(undefined);
    });

    await waitFor(() => expect(result.current.errorMessage).toBeNull());
    expect(result.current.purchaseStates.get("donation_thanks")).toBe("confirmed");
  });

  test("holds a store purchase as verifying until the server records it", async () => {
    mockVerifyPurchase.mockRejectedValue(new ApiError(502, "Store unavailable"));
    mockIAP({ availablePurchases: [makePurchase({ productId: "donation_thanks" })] });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() => expect(mockVerifyPurchase).toHaveBeenCalled());
    expect(result.current.purchaseStates.get("donation_thanks")).toBe("verifying");
  });

  test("stops calling a tier bought once the server rejects its receipt for good", async () => {
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    mockVerifyPurchase.mockRejectedValue(new ApiError(422, "Purchase was cancelled."));
    mockIAP({
      availablePurchases: [makePurchase({ productId: "donation_thanks" })],
      finishTransaction,
    });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() =>
      expect(result.current.purchaseStates.has("donation_thanks")).toBe(false),
    );
    expect(finishTransaction).toHaveBeenCalled();
  });

  test("leaves a purchase whose payment has not cleared unverified and unfinished", async () => {
    const finishTransaction = jest.fn().mockResolvedValue(undefined);
    mockIAP({
      availablePurchases: [
        makePurchase({ productId: "donation_thanks", purchaseState: "pending" }),
      ],
      finishTransaction,
    });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() =>
      expect(result.current.purchaseStates.get("donation_thanks")).toBe(
        "awaiting-payment",
      ),
    );
    expect(mockVerifyPurchase).not.toHaveBeenCalled();
    expect(finishTransaction).not.toHaveBeenCalled();
  });

  test("asks the store for the purchase list when a slow payment is started", async () => {
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    const { getOptions } = mockIAP({ getAvailablePurchases });

    renderHook(() => useDonationIapSession(), { wrapper });
    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));

    await act(async () =>
      getOptions().onPurchaseSuccess?.(makePurchase({ purchaseState: "pending" })),
    );

    expect(mockVerifyPurchase).not.toHaveBeenCalled();
    expect(getAvailablePurchases).toHaveBeenCalledTimes(2);
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
    expect(result.current.purchaseStates.has("premium2")).toBe(false);
  });

  test("re-checks the store's purchases when the app returns to the foreground", async () => {
    const sendAppState = captureAppStateHandlers();
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    mockIAP({ getAvailablePurchases });

    renderHook(() => useDonationIapSession(), { wrapper });
    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));

    await act(async () => sendAppState("active"));

    expect(getAvailablePurchases).toHaveBeenCalledTimes(2);
  });

  test("does not re-check the store's purchases when the app goes to the background", async () => {
    const sendAppState = captureAppStateHandlers();
    const getAvailablePurchases = jest.fn().mockResolvedValue(undefined);
    mockIAP({ getAvailablePurchases });

    renderHook(() => useDonationIapSession(), { wrapper });
    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(1));

    await act(async () => sendAppState("background"));

    expect(getAvailablePurchases).toHaveBeenCalledTimes(1);
  });

  test("retries a connection that never came up at launch, then gives up", async () => {
    jest.useFakeTimers();
    const reconnect = jest.fn().mockResolvedValue(false);
    mockIAP({ connected: false, reconnect });

    renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => jest.advanceTimersByTime(10_000));
    expect(reconnect).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(60_000));
    expect(reconnect).toHaveBeenCalledTimes(2);

    await act(async () => jest.advanceTimersByTime(300_000));
    expect(reconnect).toHaveBeenCalledTimes(3);

    await act(async () => jest.advanceTimersByTime(300_000));
    expect(reconnect).toHaveBeenCalledTimes(3);
  });

  test("stops retrying once the store connects", async () => {
    jest.useFakeTimers();
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ connected: false, reconnect });

    renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => jest.advanceTimersByTime(10_000));
    expect(reconnect).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(600_000));
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  test("retries a dead connection on return to the foreground and restarts the delays", async () => {
    jest.useFakeTimers();
    const sendAppState = captureAppStateHandlers();
    const reconnect = jest.fn().mockResolvedValue(false);
    mockIAP({ connected: false, reconnect });

    renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => sendAppState("active"));
    expect(reconnect).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTime(10_000));
    expect(reconnect).toHaveBeenCalledTimes(2);
  });

  test("does not retry the connection while the store is connected", async () => {
    jest.useFakeTimers();
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ reconnect });

    renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => jest.advanceTimersByTime(600_000));

    expect(reconnect).not.toHaveBeenCalled();
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

  test("reconnects when the dropped connection is only named by the Play response code", async () => {
    const fetchProducts = jest
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Failed to query product"), {
          code: ErrorCode.QueryProduct,
          responseCode: -1,
        }),
      )
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

  test("reports why a purchase request never reached the store", async () => {
    const requestPurchase = jest.fn().mockRejectedValue(
      Object.assign(new Error("billing service gone"), {
        code: ErrorCode.ServiceDisconnected,
      }),
    );
    mockIAP({ requestPurchase });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => result.current.purchase("donation_thanks"));

    expect(result.current.errorMessage).toBe(
      "Нет соединения с магазином. Проверьте интернет",
    );
    expect(result.current.purchasingProductId).toBeNull();
  });

  test("stays quiet when the purchase request is cancelled by the user", async () => {
    const requestPurchase = jest.fn().mockRejectedValue(
      Object.assign(new Error("cancelled"), {
        code: ErrorCode.UserCancelled,
      }),
    );
    mockIAP({ requestPurchase });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => result.current.purchase("donation_thanks"));

    expect(result.current.errorMessage).toBeNull();
    expect(result.current.purchasingProductId).toBeNull();
  });

  test("clears the store error once the catalog loads", async () => {
    const fetchProducts = jest
      .fn()
      .mockRejectedValueOnce(new Error("catalog unavailable"))
      .mockResolvedValue(undefined);
    mockIAP({ fetchProducts });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await act(async () => {
      await result.current.fetchPrices(["donation_thanks"]);
    });
    expect(result.current.storeError).toBe(true);

    await act(async () => {
      await result.current.fetchPrices(["donation_thanks"]);
    });
    expect(result.current.storeError).toBe(false);
  });

  test("reconnects and re-checks purchases after Play drops the billing service", async () => {
    const getAvailablePurchases = jest
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("Play Store service is not connected"), {
          code: ErrorCode.ServiceError,
        }),
      )
      .mockResolvedValue(undefined);
    const reconnect = jest.fn().mockResolvedValue(true);
    mockIAP({ getAvailablePurchases, reconnect });

    renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalledTimes(2));
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  test("keeps the store usable when re-checking purchases fails", async () => {
    const getAvailablePurchases = jest.fn().mockRejectedValue(new Error("offline"));
    mockIAP({ getAvailablePurchases });

    const { result } = renderHook(() => useDonationIapSession(), { wrapper });

    await waitFor(() => expect(getAvailablePurchases).toHaveBeenCalled());
    await act(async () => {});

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
