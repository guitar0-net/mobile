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

// initConnection() resolving to `false` (Play Store not ready, StoreKit
// unavailable) is not an error as far as expo-iap is concerned — no onError
// fires and `connected` simply stays false forever. Without this deadline the
// screen would sit on a spinner with nothing left to wait for.
const STORE_CONNECTION_TIMEOUT_MS = 10_000;

// Tier catalog (price, availability) and purchase flow (buy, restore,
// ownership) share a single useIAP() call rather than each calling it
// independently — expo-iap opens its own store connection and registers a
// full set of native listeners per call, and the two are only ever consumed
// together by DonationTierList.
export function useDonationIap(): UseDonationIapResult {
  const deviceId = useMemo(() => getDeviceId(), []);
  const [purchasingProductId, setPurchasingProductId] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Confirmed by *our own* successful verify+finish this session. Union'd
  // with availablePurchases below rather than relied on alone, since that
  // still needs to cover a tier bought in a previous session/install that
  // this session hasn't reconciled yet.
  const [confirmedProductIds, setConfirmedProductIds] = useState<Set<string>>(
    new Set(),
  );
  const reconcilingRef = useRef<Set<string>>(new Set());
  // Settled this session (verified and finished, or permanently rejected).
  // Deliberately not persisted across launches: re-verifying is idempotent
  // server-side and is what repairs a donation the server never recorded.
  const reconciledRef = useRef<Set<string>>(new Set());

  const [iapError, setIapError] = useState(false);
  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  // onError fires for transient, promise-based failures (network blips
  // during fetchProducts, store unavailable, …) — bumping this on refetch()
  // re-runs the fetchProducts effect below so a retry can actually recover,
  // instead of leaving iapError stuck true for the rest of the session.
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
    onError: () => setIapError(true),
  });

  // Reports whether the transaction is settled rather than throwing: a store
  // that refuses to finish an already-finished non-consumable must not be
  // mistaken for a failed donation, but it must still leave the receipt open
  // for a later retry.
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

  // `silent` suppresses the error banner for purchases the user didn't just
  // make — reconciling what the store already knows about runs on mount, and
  // a failure there is not something the user asked for or can act on.
  const reconcile = useCallback(
    async (purchase: Purchase, { silent = false } = {}) => {
      const key = purchase.transactionId ?? purchase.id;
      if (reconciledRef.current.has(key) || reconcilingRef.current.has(key)) return;
      reconcilingRef.current.add(key);
      try {
        try {
          await verifyPurchase(buildVerifyPayload(purchase, PLATFORM, deviceId));
        } catch (error) {
          // Leaving a permanently rejected transaction unfinished would get it
          // auto-refunded by Play after three days and re-delivered by StoreKit
          // on every launch, so finish it and stop replaying a doomed receipt.
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
    // initConnection() inside useIAP() is async — calling this before it
    // resolves throws (store not connected yet) and, since
    // getAvailablePurchases has a stable identity, this effect never
    // re-fires on its own, so the restore would silently never happen.
    if (!connected) return;
    void getAvailablePurchases();
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
        // onPurchaseError (async, event-based) covers the normal failure
        // path; this handles a request that never reaches the store at all
        // (e.g. not connected yet), which onPurchaseError never fires for —
        // without this the button would silently reset with no explanation.
        setPurchasingProductId(null);
        setErrorMessage(describePurchaseError({}));
      });
    },
    [requestPurchase, purchasingProductId],
  );

  const restore = useCallback(() => {
    if (isRestoring) return;
    setErrorMessage(null);
    setIsRestoring(true);
    // restorePurchases() already refreshes availablePurchases internally —
    // no separate getAvailablePurchases() round-trip needed here.
    void restorePurchases()
      .catch(() => setErrorMessage(RESTORE_FAILED_MESSAGE))
      .finally(() => setIsRestoring(false));
  }, [restorePurchases, isRestoring]);

  // Merges the server's active product_id list (which tiers are sellable
  // right now) with the store's own product catalog (price, in the user's
  // locale and currency) — neither source alone is enough to render a row.
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
    void fetchProducts({
      skus: visibleTiers.map((tier) => tier.productId),
      type: "in-app",
    }).finally(() => {
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
  const storeUnavailable = iapError || connectionTimedOut;

  // A tier the store doesn't price is one it can't sell — expo-iap silently
  // omits SKUs it doesn't recognize from fetchProducts, so an unpriced tier
  // stays out of the list rather than rendering a row that can't be bought.
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
      productIdsQuery.isLoading ||
      (visibleTiers.length > 0 && !fetchAttempted && !storeUnavailable),
    isError: productIdsQuery.isError || storeUnavailable,
    refetch: () => {
      setIapError(false);
      setConnectionTimedOut(false);
      setRetryToken((token) => token + 1);
      // reconnect() is the only way back from an initConnection() that
      // resolved false — the fetchProducts effect stays parked on `connected`
      // until it flips, so bumping retryToken alone would change nothing.
      if (!connected) void reconnect();
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
