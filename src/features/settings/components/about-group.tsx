// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Constants from "expo-constants";
import { SymbolView } from "expo-symbols";
import { Alert, Linking, View } from "react-native";

import { SettingsGroup } from "@/components/ui/settings-group";
import { SettingsRow } from "@/components/ui/settings-row";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

const GITHUB_URL = "https://github.com/guitar0-net";
const CONTACT_EMAIL = "guitar0.app@gmail.com";

function openContactEmail() {
  Linking.openURL(`mailto:${CONTACT_EMAIL}`).catch(() => {
    Alert.alert("Почтовый клиент не найден", `Напишите нам на ${CONTACT_EMAIL}`);
  });
}

export function AboutGroup() {
  const colors = useColors();
  const version = Constants.expoConfig?.version;

  return (
    <SettingsGroup title="О приложении">
      <View className="flex-row items-center gap-3 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-lg">
          <SymbolView
            name={{ ios: "info.circle", android: "info" }}
            size={18}
            tintColor={colors.foreground}
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
        label="GitHub"
        onPress={() => {
          Linking.openURL(GITHUB_URL).catch(() => {});
        }}
      />
      <View className="h-px bg-border" />
      <SettingsRow
        type="external"
        icon={{ ios: "envelope", android: "mail" }}
        label="Написать разработчику"
        onPress={openContactEmail}
      />
    </SettingsGroup>
  );
}
