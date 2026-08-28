// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";

import { useDonationIap } from "../use-donation-iap";
import { DonationTierRow } from "./donation-tier-row";

export function DonationTierList() {
  const {
    tiers,
    isLoading,
    isError,
    refetch,
    ownedProductIds,
    purchasingProductId,
    isRestoring,
    errorMessage,
    purchase,
    restore,
  } = useDonationIap();

  if (isError) {
    return (
      <View className="items-center gap-3 py-8">
        <StatusMessage variant="error">
          Не удалось загрузить варианты поддержки. Проверьте подключение к интернету
        </StatusMessage>
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

  return (
    <View className="gap-4">
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
              isOwned={ownedProductIds.has(tier.productId)}
              isPurchasing={purchasingProductId === tier.productId}
              onPress={() => purchase(tier.productId)}
            />
            {index < tiers.length - 1 && <View className="h-px bg-border" />}
          </View>
        ))}
      </View>

      <Button variant="link" size="sm" onPress={restore} disabled={isRestoring}>
        {isRestoring ? "Восстановление…" : "Восстановить покупки"}
      </Button>
    </View>
  );
}
