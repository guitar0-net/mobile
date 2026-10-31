// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Purchase, UseIAPOptions } from "expo-iap";
import { useIAP } from "expo-iap";
import { useState } from "react";

type StoreCalls = {
  fetchProducts: jest.Mock;
  getAvailablePurchases: jest.Mock;
  requestPurchase: jest.Mock;
  finishTransaction: jest.Mock;
  reconnect: jest.Mock;
};

type FakeIAPOptions = Partial<StoreCalls> & {
  connected?: boolean;
  products?: { id: string; displayPrice: string }[];
  /** What the store holds at launch. */
  availablePurchases?: Purchase[];
};

/**
 * Fakes useIAP() with expo-iap's contract: `availablePurchases` is a snapshot
 * that only getAvailablePurchases() re-reads, finishTransaction() removes the
 * purchase from the store but not from the snapshot, and a failed store call
 * both reaches onError and rejects.
 *
 * The passed mocks decide each call's outcome and are what tests assert on.
 */
export function mockIAP(options: FakeIAPOptions = {}) {
  const calls: StoreCalls = {
    fetchProducts: jest.fn().mockResolvedValue(undefined),
    getAvailablePurchases: jest.fn().mockResolvedValue(undefined),
    requestPurchase: jest.fn().mockResolvedValue(undefined),
    finishTransaction: jest.fn().mockResolvedValue(undefined),
    reconnect: jest.fn().mockResolvedValue(true),
    ...options,
  };
  let hookOptions: UseIAPOptions | undefined;
  let storePurchases = options.availablePurchases ?? [];
  let setSnapshot: (purchases: Purchase[]) => void = () => {};

  function reportingFailure<A extends unknown[]>(
    call: (...args: A) => Promise<unknown>,
  ) {
    return async (...args: A) => {
      try {
        return await call(...args);
      } catch (error) {
        hookOptions?.onError?.(error as Error);
        throw error;
      }
    };
  }

  const session = {
    connected: options.connected ?? true,
    products: options.products ?? [],
    fetchProducts: reportingFailure(calls.fetchProducts),
    getAvailablePurchases: reportingFailure(async () => {
      await calls.getAvailablePurchases();
      setSnapshot([...storePurchases]);
    }),
    requestPurchase: calls.requestPurchase,
    finishTransaction: async (args: { purchase: Purchase; isConsumable?: boolean }) => {
      await calls.finishTransaction(args);
      storePurchases = storePurchases.filter(
        (held) => held.purchaseToken !== args.purchase.purchaseToken,
      );
    },
    reconnect: reportingFailure(calls.reconnect),
  };

  jest.mocked(useIAP).mockImplementation((nextOptions) => {
    hookOptions = nextOptions;
    const [snapshot, setState] = useState(storePurchases);
    setSnapshot = setState;
    return {
      ...session,
      availablePurchases: snapshot,
    } as unknown as ReturnType<typeof useIAP>;
  });

  return {
    ...calls,
    getOptions: () => hookOptions!,
    /** Replaces what the store holds; the app sees it on its next re-read. */
    setStorePurchases: (purchases: Purchase[]) => {
      storePurchases = purchases;
    },
  };
}
