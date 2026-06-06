// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Image } from "expo-image";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

import { SongDetailScheme } from "../queries";

type SchemesSectionProps = {
  schemes: SongDetailScheme[];
};

export function SchemesSection({ schemes }: SchemesSectionProps) {
  return (
    <View className="mb-4 gap-3">
      <Text variant="heading">Ритмические рисунки</Text>
      {schemes.map((scheme) => {
        const remoteUri = scheme.image.startsWith("http")
          ? scheme.image
          : `${process.env.EXPO_PUBLIC_API_URL ?? ""}${scheme.image}`;
        const sources = scheme.localImagePath
          ? [{ uri: scheme.localImagePath }, { uri: remoteUri }]
          : [{ uri: remoteUri }];
        return (
          <View key={scheme.id} className="gap-1">
            <Image
              source={sources}
              style={{ width: scheme.width ?? "100%", height: scheme.height ?? 120 }}
              contentFit="contain"
            />
            {scheme.inscription && <Text variant="caption">{scheme.inscription}</Text>}
          </View>
        );
      })}
    </View>
  );
}
