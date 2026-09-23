// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchemeImage } from "@/features/lessons";
import { useColors } from "@/lib/themes";

import { type SongDetailScheme } from "../queries";

type SchemeImageProps = {
  scheme: SongDetailScheme;
  width: number | "100%";
  height: number;
};

export function SchemeImage({ scheme, width, height }: SchemeImageProps) {
  const colors = useColors();
  const image = useSchemeImage(scheme);

  if (image.state === "ready") {
    return (
      <Image source={image.source} style={{ width, height }} contentFit="contain" />
    );
  }
  if (image.state === "loading") {
    return <Skeleton style={{ width, height }} />;
  }
  return (
    <View className="items-center justify-center" style={{ width, minHeight: height }}>
      <SymbolView
        name={{ ios: "photo.badge.exclamationmark", android: "broken_image" }}
        size={28}
        tintColor={colors.mutedFg}
      />
      <Button
        variant="ghost"
        size="sm"
        accessibilityLabel="Повторить загрузку схемы"
        onPress={image.retry}
      >
        Повторить
      </Button>
    </View>
  );
}
