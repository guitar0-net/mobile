// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Purchase } from "expo-iap";
import { ErrorCode, useIAP } from "expo-iap";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import { capture } from "@/lib/analytics";
import { getDeviceId } from "@/lib/device-id";

import { verifyPurchase } from "./api";
import { isDonationProduct } from "./catalog";
import { loadConfirmedDonations, saveConfirmedDonation } from "./confirmed-donations";
import {
  describePurchaseError,
  describeVerifyError,
  isPermanentVerifyRejection,
  purchaseFailureReason,
} from "./purchase-errors";
import type { DonationPlatform } from "./verify-payload";
import { buildVerifyPayload } from "./verify-payload";

export type DonationPurchaseState = "awaiting-payment" | "verifying";

/** The latest donation the server confirmed in this app session. */
export type DonationThanks = { productId: string; transactionId: string };

type DonationIapSession = {
  connected: boolean;
  storeError: boolean;
  prices: ReadonlyMap<string, string>;
  fetchPrices: (productIds: readonly string[]) => Promise<void>;
  retryConnection: () => void;
  purchaseStates: ReadonlyMap<string, DonationPurchaseState>;
  purchasingProductId: string | null;
  thanks: DonationThanks | null;
  errorMessage: string | null;
  purchase: (productId: string) => void;
};

type PurchaseAttempt = { productId: string; failureReported: boolean };

const PLATFORM: DonationPlatform = Platform.OS === "ios" ? "ios" : "android";

const RECONNECT_DELAYS_MS = [10_000, 60_000, 300_000];

const DISCONNECTED_CODES: readonly ErrorCode[] = [
  ErrorCode.NotPrepared,
  ErrorCode.ServiceDisconnected,
  ErrorCode.InitConnection,
  ErrorCode.ServiceError,
];

const SERVICE_DISCONNECTED_RESPONSE_CODE = -1;

// Play drops the billing service on its own — a Play Store update, a long
// backgrounded app — and expo-iap keeps reporting `connected: true` afterwards,
// so a dead connection only shows up as a rejection from the next store call.
function isStoreDisconnected(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code, responseCode } = error as {
    code?: ErrorCode;
    responseCode?: number;
  };
  if (responseCode === SERVICE_DISCONNECTED_RESPONSE_CODE) return true;
  return code !== undefined && DISCONNECTED_CODES.includes(code);
}

function purchaseKey(purchase: Purchase): string {
  return purchase.transactionId ?? purchase.id;
}

function isAlreadyOwned(error: unknown): boolean {
  return (error as { code?: ErrorCode } | null)?.code === ErrorCode.AlreadyOwned;
}

function isAwaitingPayment(purchase: Purchase): boolean {
  return purchase.purchaseState === "pending";
}

const SessionContext = createContext<DonationIapSession | null>(null);

export function DonationIapProvider({ children }: { children: React.ReactNode }) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const purchaseAttemptRef = useRef<PurchaseAttempt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [thanks, setThanks] = useState<DonationThanks | null>(null);
  const reconcilingRef = useRef<Set<string>>(new Set());
  const reconciledRef = useRef<Set<string>>(new Set());
  const [settledKeys, setSettledKeys] = useState<ReadonlySet<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);
  const [storeError, setStoreError] = useState(false);

  const reportStoreFailure = useCallback(
    (error: unknown, attempt: PurchaseAttempt | null) => {
      if (attempt?.failureReported) return;
      if (attempt) attempt.failureReported = true;
      setPurchasingProductId(null);
      capture("donation_purchase_failed", {
        product_id: attempt?.productId ?? null,
        stage: "store",
        reason: purchaseFailureReason(error),
      });
      const message = describePurchaseError(error);
      if (message) setErrorMessage(message);
    },
    [],
  );

  const {
    connected,
    products,
    fetchProducts,
    availablePurchases,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
    reconnect,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      purchaseAttemptRef.current = null;
      setPurchasingProductId(null);
      if (isAwaitingPayment(purchase)) {
        void refreshPurchases();
        return;
      }
      void reconcile(purchase);
    },
    onPurchaseError: (error) => {
      const attempt = purchaseAttemptRef.current;
      purchaseAttemptRef.current = null;
      reportStoreFailure(error, attempt);
      // Play refuses a consumable whose previous purchase was never consumed;
      // re-reading the purchase list hands that purchase to reconcile().
      if (isAlreadyOwned(error)) void refreshPurchases();
    },
  });

  const withReconnect = useCallback(
    async <T,>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (error) {
        if (!isStoreDisconnected(error)) throw error;
        const reconnected = await reconnect().catch(() => false);
        if (!reconnected) throw error;
        return await call();
      }
    },
    [reconnect],
  );

  const finish = useCallback(
    async (purchase: Purchase): Promise<boolean> => {
      try {
        await finishTransaction({ purchase, isConsumable: true });
        return true;
      } catch {
        return false;
      }
    },
    [finishTransaction],
  );

  const settle = useCallback((key: string) => {
    reconciledRef.current.add(key);
    setSettledKeys((prev) => new Set(prev).add(key));
  }, []);

  const reconcile = useCallback(
    async (purchase: Purchase, { silent = false } = {}) => {
      if (isAwaitingPayment(purchase)) return;
      const key = purchaseKey(purchase);
      if (reconciledRef.current.has(key) || reconcilingRef.current.has(key)) return;
      reconcilingRef.current.add(key);
      try {
        let response;
        try {
          response = await verifyPurchase(
            buildVerifyPayload(purchase, PLATFORM, deviceId),
          );
        } catch (error) {
          // An unfinished transaction is auto-refunded by Play after three days
          // and re-delivered by StoreKit on every launch, so a doomed receipt
          // still has to be finished.
          const isPermanent = isPermanentVerifyRejection(error);
          if (isPermanent) {
            await finish(purchase);
            settle(key);
          }
          if (!silent || isPermanent) {
            capture("donation_purchase_failed", {
              product_id: purchase.productId,
              stage: "verify",
              reason: purchaseFailureReason(error),
            });
          }
          if (!silent) setErrorMessage(describeVerifyError(error));
          return;
        }

        setThanks({ productId: purchase.productId, transactionId: key });
        setErrorMessage(null);
        const finished = await finish(purchase);
        if (!finished) return;
        settle(key);
        capture("donation_purchase_confirmed", {
          product_id: purchase.productId,
          source: silent ? "background" : "purchase",
        });
        await saveConfirmedDonation(
          key,
          purchase.productId,
          response.verified_at,
        ).catch(() => {});
      } finally {
        reconcilingRef.current.delete(key);
      }
    },
    [deviceId, finish, settle],
  );

  useEffect(() => {
    let cancelled = false;
    void loadConfirmedDonations()
      .then((stored) => {
        if (cancelled) return;
        for (const key of stored.keys()) reconciledRef.current.add(key);
        setSettledKeys((prev) => new Set([...stored.keys(), ...prev]));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshPurchases = useCallback(
    () => withReconnect(() => getAvailablePurchases()).catch(() => {}),
    [getAvailablePurchases, withReconnect],
  );

  useEffect(() => {
    // The store rejects every query until initConnection() resolves.
    if (!connected) return;
    void refreshPurchases();
    // Both stores hand over a purchase completed while the app was away only
    // when asked, so every return to the foreground asks again.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPurchases();
    });
    return () => subscription.remove();
  }, [connected, refreshPurchases]);

  // useIAP runs initConnection() once on mount and never retries, and a
  // connection that never came up leaves the purchase listeners unregistered,
  // so a dead store at launch stays dead until something asks it again.
  useEffect(() => {
    if (connected) return;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function scheduleRetry() {
      if (attempt >= RECONNECT_DELAYS_MS.length) return;
      timer = setTimeout(runRetry, RECONNECT_DELAYS_MS[attempt]);
      attempt += 1;
    }

    function runRetry() {
      void reconnect()
        .catch(() => false)
        .then((reconnected) => {
          if (!reconnected) scheduleRetry();
        });
    }

    scheduleRetry();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      clearTimeout(timer);
      attempt = 0;
      runRetry();
    });

    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [connected, reconnect]);

  useEffect(() => {
    if (!isHydrated) return;
    for (const availablePurchase of availablePurchases) {
      if (!isDonationProduct(availablePurchase.productId)) continue;
      void reconcile(availablePurchase, { silent: true });
    }
  }, [availablePurchases, reconcile, isHydrated]);

  const purchaseStates = useMemo(() => {
    const states = new Map<string, DonationPurchaseState>();
    for (const availablePurchase of availablePurchases) {
      if (!isDonationProduct(availablePurchase.productId)) continue;
      if (settledKeys.has(purchaseKey(availablePurchase))) continue;
      states.set(
        availablePurchase.productId,
        isAwaitingPayment(availablePurchase) ? "awaiting-payment" : "verifying",
      );
    }
    return states;
  }, [availablePurchases, settledKeys]);

  const prices = useMemo(
    () => new Map(products.map((product) => [product.id, product.displayPrice])),
    [products],
  );

  const fetchPrices = useCallback(
    (productIds: readonly string[]) =>
      withReconnect(() =>
        fetchProducts({ skus: [...productIds], type: "in-app" }),
      ).then(
        () => setStoreError(false),
        () => setStoreError(true),
      ),
    [fetchProducts, withReconnect],
  );

  const purchase = useCallback(
    (productId: string) => {
      if (purchasingProductId !== null) return;
      setErrorMessage(null);
      setPurchasingProductId(productId);
      const attempt = { productId, failureReported: false };
      purchaseAttemptRef.current = attempt;
      capture("donation_purchase_started", {
        product_id: productId,
      });
      void requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: "in-app",
      }).catch((error) => reportStoreFailure(error, attempt));
    },
    [requestPurchase, purchasingProductId, reportStoreFailure],
  );

  const retryConnection = useCallback(() => {
    setStoreError(false);
    if (connected) return;
    // reconnect() is the only way back from an initConnection() that resolved
    // false, and it reports failure by resolving false rather than rejecting.
    void reconnect()
      .catch(() => false)
      .then((reconnected) => {
        if (!reconnected) setStoreError(true);
      });
  }, [connected, reconnect]);

  const session = useMemo(
    () => ({
      connected,
      storeError,
      prices,
      fetchPrices,
      retryConnection,
      purchaseStates,
      purchasingProductId,
      thanks,
      errorMessage,
      purchase,
    }),
    [
      connected,
      storeError,
      prices,
      fetchPrices,
      retryConnection,
      purchaseStates,
      purchasingProductId,
      thanks,
      errorMessage,
      purchase,
    ],
  );

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useDonationIapSession(): DonationIapSession {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error("useDonationIapSession must be used inside DonationIapProvider");
  }
  return session;
}
