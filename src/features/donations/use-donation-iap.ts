// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import type { Purchase } from "expo-iap";
import { useIAP } from "expo-iap";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import { getDeviceId } from "@/lib/device-id";

import { getActiveDonationProductIds, verifyPurchase } from "./api";
import { type DonationTier, getVisibleTiers } from "./catalog";
import {
  describePurchaseError,
  describeVerifyError,
  isPermanentVerifyRejection,
  RESTORE_FAILED_MESSAGE,
} from "./purchase-errors";
import type { DonationPlatform } from "./verify-payload";
import { buildVerifyPayload } from "./verify-payload";

export type DonationTierView = DonationTier & {
  displayPrice: string;
};

type UseDonationIapResult = {
  tiers: DonationTierView[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  ownedProductIds: Set<string>;
  purchasingProductId: string | null;
  isRestoring: boolean;
  errorMessage: string | null;
  purchase: (productId: string) => void;
  restore: () => void;
};

const PLATFORM: DonationPlatform = Platform.OS === "ios" ? "ios" : "android";

// expo-iap treats an initConnection() that resolves `false` as a non-event:
// no onError fires and `connected` stays false forever, so without a deadline
// the screen waits on a spinner that can never resolve.
const STORE_CONNECTION_TIMEOUT_MS = 10_000;

// Catalog and purchase flow share one useIAP() call because expo-iap opens a
// store connection and registers native listeners per call.
export function useDonationIap(): UseDonationIapResult {
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

  const [iapError, setIapError] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [completedFetchKey, setCompletedFetchKey] = useState<string | null>(null);

  const productIdsQuery = useQuery({
    queryKey: ["donations", "activeProductIds"],
    queryFn: getActiveDonationProductIds,
  });

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
    // The only failure this hook can't catch at the call site is the
    // initConnection() useIAP runs on mount. onError also fires for restore
    // failures, which restore() reports inline instead.
    onError: () => {
      if (!restoringRef.current) setIapError(true);
    },
  });

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
        if (!silent) setErrorMessage(null);
        const finished = await finish(purchase);
        if (finished) reconciledRef.current.add(key);
      } finally {
        reconcilingRef.current.delete(key);
      }
    },
    [deviceId, finish],
  );

  useEffect(() => {
    // useIAP()'s initConnection() is async, and getAvailablePurchases throws
    // until it resolves.
    if (!connected) return;
    getAvailablePurchases().catch(() => setIapError(true));
  }, [connected, getAvailablePurchases]);

  useEffect(() => {
    for (const availablePurchase of availablePurchases)
      void reconcile(availablePurchase, { silent: true });
  }, [availablePurchases, reconcile]);

  const ownedProductIds = useMemo(() => {
    const merged = new Set(confirmedProductIds);
    for (const availablePurchase of availablePurchases) {
      merged.add(availablePurchase.productId);
    }
    return merged;
  }, [confirmedProductIds, availablePurchases]);

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
      }).catch(() => {
        // onPurchaseError covers store-side failures; a request that never
        // reaches the store rejects here instead and fires no event.
        setPurchasingProductId(null);
        setErrorMessage(describePurchaseError({}));
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
    restorePurchases()
      .catch(() => setErrorMessage(RESTORE_FAILED_MESSAGE))
      .finally(() => {
        restoringRef.current = false;
        setIsRestoring(false);
      });
  }, [restorePurchases]);

  const visibleTiers = useMemo(
    () => getVisibleTiers(productIdsQuery.data ?? []),
    [productIdsQuery.data],
  );

  const fetchKey = useMemo(
    () => visibleTiers.map((tier) => tier.productId).join(",") + `#${retryToken}`,
    [visibleTiers, retryToken],
  );

  useEffect(() => {
    if (!connected || visibleTiers.length === 0) return;
    let cancelled = false;
    fetchProducts({
      skus: visibleTiers.map((tier) => tier.productId),
      type: "in-app",
    })
      .catch(() => setIapError(true))
      .finally(() => {
        if (!cancelled) setCompletedFetchKey(fetchKey);
      });
    return () => {
      cancelled = true;
    };
  }, [connected, visibleTiers, fetchProducts, fetchKey]);

  useEffect(() => {
    if (connected || connectionTimedOut || visibleTiers.length === 0) return;
    const timer = setTimeout(
      () => setConnectionTimedOut(true),
      STORE_CONNECTION_TIMEOUT_MS,
    );
    return () => clearTimeout(timer);
  }, [connected, connectionTimedOut, visibleTiers.length]);

  const fetchAttempted = completedFetchKey === fetchKey;
  // With nothing to sell, a dead store connection changes nothing the user can
  // act on, so an empty catalog keeps its own message instead of the retry one.
  const hasCatalog = visibleTiers.length > 0;
  const storeUnavailable = hasCatalog && (iapError || connectionTimedOut);

  // expo-iap silently omits SKUs it doesn't recognize from fetchProducts, so
  // an unpriced tier is one the store can't sell.
  const tiers = useMemo(
    () =>
      visibleTiers.flatMap((tier) => {
        const displayPrice = products.find(
          (product) => product.id === tier.productId,
        )?.displayPrice;
        return displayPrice === undefined ? [] : [{ ...tier, displayPrice }];
      }),
    [visibleTiers, products],
  );

  return {
    tiers,
    isLoading:
      productIdsQuery.isLoading || (hasCatalog && !fetchAttempted && !storeUnavailable),
    isError: productIdsQuery.isError || storeUnavailable,
    refetch: () => {
      setIapError(false);
      setConnectionTimedOut(false);
      setRetryToken((token) => token + 1);
      // reconnect() is the only way back from an initConnection() that resolved
      // false, and it reports failure by resolving false rather than rejecting.
      if (!connected) {
        void reconnect()
          .catch(() => false)
          .then((reconnected) => {
            if (!reconnected) setIapError(true);
          });
      }
      // React Query's refetch() resolves with the error instead of rejecting.
      void productIdsQuery.refetch();
    },
    ownedProductIds,
    purchasingProductId,
    isRestoring,
    errorMessage,
    purchase,
    restore,
  };
}
