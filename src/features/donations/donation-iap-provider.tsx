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

import { getDeviceId } from "@/lib/device-id";

import { verifyPurchase } from "./api";
import { isDonationProduct } from "./catalog";
import {
  describePurchaseError,
  describeVerifyError,
  isPermanentVerifyRejection,
  RESTORE_FAILED_MESSAGE,
} from "./purchase-errors";
import type { DonationPlatform } from "./verify-payload";
import { buildVerifyPayload } from "./verify-payload";

type DonationIapSession = {
  connected: boolean;
  storeError: boolean;
  prices: ReadonlyMap<string, string>;
  fetchPrices: (productIds: readonly string[]) => Promise<void>;
  retryConnection: () => void;
  ownedProductIds: Set<string>;
  purchasingProductId: string | null;
  isRestoring: boolean;
  errorMessage: string | null;
  purchase: (productId: string) => void;
  restore: () => void;
};

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

const SessionContext = createContext<DonationIapSession | null>(null);

/**
 * Store session shared by the whole app: one billing connection, one set of
 * purchase listeners, and the verify-then-finish loop that settles every
 * purchase the stores hand us.
 *
 * Mounted at the root rather than on the donation screen because both stores
 * deliver purchases outside it — a Play payment that clears hours later, a
 * StoreKit transaction interrupted by a relaunch. An unsettled Play purchase is
 * auto-refunded after three days, so waiting for the user to reopen the screen
 * would silently lose donations.
 */
export function DonationIapProvider({ children }: { children: React.ReactNode }) {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoringRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedProductIds, setConfirmedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const reconcilingRef = useRef<Set<string>>(new Set());
  const reconciledRef = useRef<Set<string>>(new Set());
  const [storeError, setStoreError] = useState(false);

  const {
    connected,
    products,
    fetchProducts,
    availablePurchases,
    getAvailablePurchases,
    requestPurchase,
    finishTransaction,
    restorePurchases,
    reconnect,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      setPurchasingProductId(null);
      void reconcile(purchase);
    },
    onPurchaseError: (error) => {
      setPurchasingProductId(null);
      const message = describePurchaseError(error);
      if (message) setErrorMessage(message);
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

  // A store refusing to finish an already-finished non-consumable is not a
  // failed donation, so this reports settlement instead of throwing.
  const finish = useCallback(
    async (purchase: Purchase): Promise<boolean> => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        return true;
      } catch {
        return false;
      }
    },
    [finishTransaction],
  );

  const reconcile = useCallback(
    async (purchase: Purchase, { silent = false } = {}) => {
      const key = purchase.transactionId ?? purchase.id;
      if (reconciledRef.current.has(key) || reconcilingRef.current.has(key)) return;
      reconcilingRef.current.add(key);
      try {
        try {
          await verifyPurchase(buildVerifyPayload(purchase, PLATFORM, deviceId));
        } catch (error) {
          // An unfinished transaction is auto-refunded by Play after three days
          // and re-delivered by StoreKit on every launch, so a doomed receipt
          // still has to be finished.
          if (isPermanentVerifyRejection(error)) {
            const finished = await finish(purchase);
            if (finished) reconciledRef.current.add(key);
          }
          if (!silent) setErrorMessage(describeVerifyError(error));
          return;
        }

        setConfirmedProductIds((prev) => new Set(prev).add(purchase.productId));
        setErrorMessage(null);
        const finished = await finish(purchase);
        if (finished) reconciledRef.current.add(key);
      } finally {
        reconcilingRef.current.delete(key);
      }
    },
    [deviceId, finish],
  );

  // Re-checking purchases is background work the user never asked for, so its
  // failure must not hide the tiers. Whether the store works is decided by
  // whether it hands over the catalog.
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
    for (const availablePurchase of availablePurchases) {
      // The stores also list purchases of products this build knows nothing
      // about — retired SKUs from earlier versions — and the server has no
      // donation to match them to.
      if (!isDonationProduct(availablePurchase.productId)) continue;
      void reconcile(availablePurchase, { silent: true });
    }
  }, [availablePurchases, reconcile]);

  const ownedProductIds = useMemo(() => {
    const merged = new Set(confirmedProductIds);
    for (const availablePurchase of availablePurchases) {
      if (isDonationProduct(availablePurchase.productId)) {
        merged.add(availablePurchase.productId);
      }
    }
    return merged;
  }, [confirmedProductIds, availablePurchases]);

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
      void requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId] },
        },
        type: "in-app",
      }).catch((error) => {
        // onPurchaseError covers store-side failures; a request that never
        // reaches the store rejects here instead and fires no event. It is not
        // retried automatically — a second attempt could open a second dialog.
        setPurchasingProductId(null);
        const message = describePurchaseError(error);
        if (message) setErrorMessage(message);
      });
    },
    [requestPurchase, purchasingProductId],
  );

  const restore = useCallback(() => {
    if (restoringRef.current) return;
    restoringRef.current = true;
    setErrorMessage(null);
    setIsRestoring(true);
    // restorePurchases() refreshes availablePurchases itself.
    withReconnect(() => restorePurchases())
      .catch(() => setErrorMessage(RESTORE_FAILED_MESSAGE))
      .finally(() => {
        restoringRef.current = false;
        setIsRestoring(false);
      });
  }, [restorePurchases, withReconnect]);

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
      ownedProductIds,
      purchasingProductId,
      isRestoring,
      errorMessage,
      purchase,
      restore,
    }),
    [
      connected,
      storeError,
      prices,
      fetchPrices,
      retryConnection,
      ownedProductIds,
      purchasingProductId,
      isRestoring,
      errorMessage,
      purchase,
      restore,
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
