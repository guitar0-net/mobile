// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Constants from "expo-constants";
import { SymbolView } from "expo-symbols";
import { Linking, View } from "react-native";

import { SettingsRow } from "@/components/ui/settings-row";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

const GITHUB_URL = "https://github.com/guitar0-net";
const CONTACT_EMAIL_URL = "mailto:guitar0.app@gmail.com";

export function AboutGroup() {
  const colors = useColors();
  const version = Constants.expoConfig?.version;

  return (
    <View className="mt-6">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-fg">
        О приложении
      </Text>
      <View className="overflow-hidden rounded-xl bg-surface px-4">
        <View className="flex-row items-center gap-3 py-3">
          <View
            className="h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: colors.brandRed }}
          >
            <SymbolView
              name={{ ios: "info.circle", android: "info" }}
              size={18}
              tintColor={colors.primaryFg}
            />
          </View>
          <View className="flex-1">
            <Text>Версия</Text>
          </View>
          {version !== undefined && <Text variant="caption">{version}</Text>}
        </View>
        <View className="h-px bg-border" />
        <SettingsRow
          type="external"
          icon={{ ios: "chevron.left.forwardslash.chevron.right", android: "code" }}
          iconBgColor={colors.brandAmber}
          label="GitHub"
          onPress={() => {
            Linking.openURL(GITHUB_URL).catch(() => {});
          }}
        />
        <View className="h-px bg-border" />
        <SettingsRow
          type="external"
          icon={{ ios: "envelope", android: "mail" }}
          iconBgColor={colors.brandBrown}
          label="Написать разработчику"
          onPress={() => {
            Linking.openURL(CONTACT_EMAIL_URL).catch(() => {});
          }}
        />
      </View>
    </View>
  );
}
