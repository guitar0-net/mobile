// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { getActiveDonationProductIds } from "./api";
import { type DonationTier, getVisibleTiers } from "./catalog";
import { useDonationIapSession } from "./donation-iap-provider";

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

// The store connection is opened at app start, but the screen can still be
// reached before it settles, and expo-iap treats an initConnection() that
// resolves `false` as a non-event: no onError fires and `connected` stays false
// forever, so without a deadline the screen waits on a spinner that can never
// resolve.
const STORE_CONNECTION_TIMEOUT_MS = 10_000;

export function useDonationIap(): UseDonationIapResult {
  const {
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
  } = useDonationIapSession();

  const [connectionTimedOut, setConnectionTimedOut] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [completedFetchKey, setCompletedFetchKey] = useState<string | null>(null);

  const productIdsQuery = useQuery({
    queryKey: ["donations", "activeProductIds"],
    queryFn: getActiveDonationProductIds,
  });

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
    void fetchPrices(visibleTiers.map((tier) => tier.productId)).finally(() => {
      if (!cancelled) setCompletedFetchKey(fetchKey);
    });
    return () => {
      cancelled = true;
    };
  }, [connected, visibleTiers, fetchPrices, fetchKey]);

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
  const storeUnavailable = hasCatalog && (storeError || connectionTimedOut);

  // expo-iap silently omits SKUs it doesn't recognize from fetchProducts, so
  // an unpriced tier is one the store can't sell.
  const tiers = useMemo(
    () =>
      visibleTiers.flatMap((tier) => {
        const displayPrice = prices.get(tier.productId);
        return displayPrice === undefined ? [] : [{ ...tier, displayPrice }];
      }),
    [visibleTiers, prices],
  );

  return {
    tiers,
    isLoading:
      productIdsQuery.isLoading || (hasCatalog && !fetchAttempted && !storeUnavailable),
    isError: productIdsQuery.isError || storeUnavailable,
    refetch: () => {
      setConnectionTimedOut(false);
      setRetryToken((token) => token + 1);
      retryConnection();
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
