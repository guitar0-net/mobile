// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

import type { DonationPurchaseState } from "../donation-iap-provider";
import type { DonationTierView } from "../use-donation-iap";

type Props = {
  tier: DonationTierView;
  purchaseState: DonationPurchaseState | undefined;
  isPurchasing: boolean;
  onPress: () => void;
};

export function DonationTierRow({ tier, purchaseState, isPurchasing, onPress }: Props) {
  const colors = useColors();
  const disabled = purchaseState !== undefined || isPurchasing;

  let trailing: React.ReactNode;
  if (purchaseState === "confirmed") {
    trailing = (
      <SymbolView
        name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
        size={20}
        tintColor={colors.success}
      />
    );
  } else if (purchaseState === "pending") {
    trailing = (
      <Text variant="caption" className="text-muted-fg">
        Проверяем…
      </Text>
    );
  } else if (isPurchasing) {
    trailing = (
      <Text variant="caption" className="text-muted-fg">
        Покупка…
      </Text>
    );
  } else {
    trailing = (
      <Text variant="caption" className="text-muted-fg">
        {tier.displayPrice}
      </Text>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-center gap-3 py-3 active:opacity-70"
    >
      <View className="h-9 w-9 items-center justify-center rounded-lg">
        <SymbolView name={tier.icon} size={18} tintColor={colors.foreground} />
      </View>
      <View className="flex-1">
        <Text>{tier.label}</Text>
      </View>
      {trailing}
    </Pressable>
  );
}
