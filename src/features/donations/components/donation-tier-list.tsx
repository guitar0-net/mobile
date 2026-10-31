// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";

import { type DonationLoadError, useDonationIap } from "../use-donation-iap";
import { DonationThanksCard } from "./donation-thanks-card";
import { DonationTierRow } from "./donation-tier-row";

const LOAD_ERROR_MESSAGES: Record<DonationLoadError, string> = {
  catalog: "Не удалось загрузить варианты поддержки. Проверьте подключение к интернету",
  store: "Магазин недоступен. Попробуйте ещё раз позже",
};

export function DonationTierList() {
  const {
    tiers,
    isLoading,
    loadError,
    refetch,
    purchaseStates,
    purchasingProductId,
    thanks,
    errorMessage,
    purchase,
  } = useDonationIap();

  if (loadError !== null) {
    return (
      <View className="items-center gap-3 py-8">
        <StatusMessage variant="error">{LOAD_ERROR_MESSAGES[loadError]}</StatusMessage>
        <Button variant="outline" size="sm" onPress={refetch}>
          Повторить
        </Button>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="items-center py-8">
        <Text variant="caption" className="text-muted-fg">
          Загрузка…
        </Text>
      </View>
    );
  }

  if (tiers.length === 0) {
    return (
      <View className="items-center py-8">
        <Text variant="caption" className="text-center text-muted-fg">
          Сейчас поддержка временно недоступна
        </Text>
      </View>
    );
  }

  const thankedTier =
    thanks === null
      ? undefined
      : tiers.find((tier) => tier.productId === thanks.productId);

  return (
    <View className="gap-4">
      {thanks !== null && thankedTier !== undefined && (
        <DonationThanksCard key={thanks.transactionId} tier={thankedTier} />
      )}

      {errorMessage !== null && (
        <StatusMessage variant="error" inline>
          {errorMessage}
        </StatusMessage>
      )}

      <View className="overflow-hidden rounded-xl bg-surface px-4">
        {tiers.map((tier, index) => (
          <View key={tier.productId}>
            <DonationTierRow
              tier={tier}
              purchaseState={purchaseStates.get(tier.productId)}
              isPurchasing={purchasingProductId === tier.productId}
              onPress={() => purchase(tier.productId)}
            />
            {index < tiers.length - 1 && <View className="h-px bg-border" />}
          </View>
        ))}
      </View>
    </View>
  );
}
