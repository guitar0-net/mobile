// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { View } from "react-native";

import { SettingsRow } from "@/components/ui/settings-row";
import { useColors } from "@/lib/themes";

export function DonationSupportCard() {
  const router = useRouter();
  const colors = useColors();

  return (
    <View className="mt-4 overflow-hidden rounded-xl bg-surface px-4">
      <SettingsRow
        type="nav"
        icon={{ ios: "heart.fill", android: "favorite" }}
        iconBgColor={colors.primary}
        label="Поддержать проект"
        sublabel="Помогает развивать приложение"
        onPress={() => router.push("/donate")}
      />
    </View>
  );
}
