// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { Linking, Platform, View } from "react-native";

import { SettingsGroup } from "@/components/ui/settings-group";
import { SettingsRow } from "@/components/ui/settings-row";

const STORE_REVIEW_URLS: Partial<Record<typeof Platform.OS, string>> = {
  android: "https://play.google.com/store/apps/details?id=com.andreykotlyar.guitar0",
  ios: "https://apps.apple.com/app/id6818752464?action=write-review",
};

export function SupportGroup() {
  const router = useRouter();
  const storeReviewUrl = STORE_REVIEW_URLS[Platform.OS];

  return (
    <SettingsGroup title="Поддержка">
      <SettingsRow
        type="nav"
        icon={{ ios: "heart.fill", android: "favorite" }}
        label="Поддержать проект"
        onPress={() => router.push("/donate")}
      />
      {storeReviewUrl !== undefined && (
        <>
          <View className="h-px bg-border" />
          <SettingsRow
            type="external"
            icon={{ ios: "star", android: "star" }}
            label="Оценить приложение"
            onPress={() => {
              Linking.openURL(storeReviewUrl).catch(() => {});
            }}
          />
        </>
      )}
    </SettingsGroup>
  );
}
