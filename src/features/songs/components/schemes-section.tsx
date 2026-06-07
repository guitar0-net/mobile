// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Image } from "expo-image";
import { View, useWindowDimensions } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";

import { type SongDetailScheme } from "../queries";
import { ControlButton, SectionHeader } from "./section-header";

const HORIZONTAL_PADDING = 32;
const FALLBACK_HEIGHTS = [60, 90, 120, 160, 200] as const;

function computeSize(
  naturalWidth: number | null,
  naturalHeight: number | null,
  size: DiagramSize,
  screenWidth: number,
): { width: number | "100%"; height: number } {
  if (naturalWidth == null || naturalHeight == null) {
    return { width: "100%", height: FALLBACK_HEIGHTS[size - 1] };
  }
  const rawWidth = (naturalWidth * size) / 3;
  const width = Math.min(rawWidth, screenWidth - HORIZONTAL_PADDING);
  const height = Math.round((naturalHeight / naturalWidth) * width);
  return { width, height };
}

export function SchemesSection({ schemes }: { schemes: SongDetailScheme[] }) {
  const {
    imageSchemeSize,
    imageSchemeVisible,
    setImageSchemeSize,
    setImageSchemeVisible,
  } = useDiagramSettings();
  const { width: screenWidth } = useWindowDimensions();

  if (!imageSchemeVisible) {
    return (
      <View className="mb-4">
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onPress={() => setImageSchemeVisible(true)}
        >
          Показать ритмические рисунки
        </Button>
      </View>
    );
  }

  return (
    <View className="mb-4 gap-3">
      <SectionHeader title="Ритмические рисунки">
        <ControlButton
          icon={{ ios: "minus", android: "remove" }}
          onPress={() => setImageSchemeSize((imageSchemeSize - 1) as DiagramSize)}
          disabled={imageSchemeSize === 1}
        />
        <ControlButton
          icon={{ ios: "plus", android: "add" }}
          onPress={() => setImageSchemeSize((imageSchemeSize + 1) as DiagramSize)}
          disabled={imageSchemeSize === 5}
        />
        <ControlButton
          icon={{ ios: "eye.slash", android: "visibility_off" }}
          onPress={() => setImageSchemeVisible(false)}
        />
      </SectionHeader>
      {schemes.map((scheme) => {
        const remoteUri = scheme.image.startsWith("http")
          ? scheme.image
          : `${process.env.EXPO_PUBLIC_API_URL ?? ""}${scheme.image}`;
        const sources = scheme.localImagePath
          ? [{ uri: scheme.localImagePath }, { uri: remoteUri }]
          : [{ uri: remoteUri }];
        const { width, height } = computeSize(
          scheme.width,
          scheme.height,
          imageSchemeSize,
          screenWidth,
        );
        return (
          <View key={scheme.id} className="gap-1">
            <Image source={sources} style={{ width, height }} contentFit="contain" />
            {scheme.inscription && <Text variant="caption">{scheme.inscription}</Text>}
          </View>
        );
      })}
    </View>
  );
}
