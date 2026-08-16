// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { getDeviceId } from "@/lib/device-id";
import { useColors } from "@/lib/themes";

export function ProfileHeader() {
  const colors = useColors();
  const shortDeviceId = getDeviceId().slice(0, 8);

  return (
    <View className="items-center gap-1 py-2">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-primary">
        <SymbolView
          name={{ ios: "person.fill", android: "person" }}
          size={40}
          tintColor={colors.primaryFg}
        />
      </View>
      <Text variant="heading" className="mt-3">
        Локальный профиль
      </Text>
      <Text variant="caption">ID устройства: {shortDeviceId}</Text>
      <Badge
        variant="outline"
        icon={{ ios: "icloud.slash", android: "cloud_off" }}
        className="mt-2 self-center"
      >
        Прогресс хранится только на этом устройстве
      </Badge>
    </View>
  );
}
