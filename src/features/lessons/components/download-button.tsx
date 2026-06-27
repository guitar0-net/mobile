// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import type { SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { VideoDownloadStatus } from "@/lib/db";
import { useColors } from "@/lib/themes";

const SIZE = 44;
const ICON_SIZE = 22;
const STROKE_WIDTH = 2.5;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  status: VideoDownloadStatus;
  progress: number;
  onPress: () => void;
};

export function DownloadButton({ status, progress, onPress }: Props) {
  const colors = useColors();

  let icon: SymbolViewProps["name"];
  if (status === "downloaded") {
    icon = { ios: "trash", android: "delete" };
  } else if (status === "downloading") {
    icon = { ios: "xmark", android: "close" };
  } else if (status === "failed") {
    icon = { ios: "arrow.counterclockwise", android: "refresh" };
  } else {
    icon = { ios: "arrow.down.to.line", android: "download" };
  }

  const isDownloading = status === "downloading";
  const offset = CIRCUMFERENCE * (1 - progress / 100);

  let accessibilityLabel: string;
  if (status === "downloaded") accessibilityLabel = "Удалить загрузку";
  else if (status === "downloading") accessibilityLabel = "Отменить загрузку";
  else if (status === "failed") accessibilityLabel = "Повторить загрузку";
  else accessibilityLabel = "Скачать видео";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    >
      {({ pressed }) => (
        <View style={{ opacity: pressed ? 0.7 : 1 }}>
          <View
            style={{
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              borderWidth: isDownloading ? 0 : 1,
              borderColor: status === "failed" ? colors.destructive : colors.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SymbolView name={icon} size={ICON_SIZE} tintColor={colors.foreground} />
            {isDownloading && (
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
                  <Circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    stroke={colors.primary}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    transform={`rotate(-90, ${SIZE / 2}, ${SIZE / 2})`}
                  />
                </Svg>
              </View>
            )}
          </View>
        </View>
      )}
    </Pressable>
  );
}
