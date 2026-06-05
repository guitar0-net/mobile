// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { formatDateRu, stripMarkdown } from "@/lib/utils";

import type { AnnouncementItem } from "./api";

type Props = {
  item: AnnouncementItem;
  onPress?: () => void;
};

export function AnnouncementCard({ item, onPress }: Props) {
  const { primary } = useColors();

  const isUpdate = Boolean(item.product_version);
  const badgeBg = isUpdate ? primary + "1F" : "#D9770620";
  const iconColor = isUpdate ? primary : "#D97706";
  const iconName = isUpdate
    ? { ios: "sparkles" as const, android: "auto_awesome" as const }
    : { ios: "music.note" as const, android: "music_note" as const };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View className="flex-row gap-3 rounded-xl border border-border bg-surface p-4">
        <View
          className="h-12 w-12 items-center justify-center rounded-2xl"
          style={{ backgroundColor: badgeBg }}
        >
          <SymbolView name={iconName} size={22} tintColor={iconColor} />
        </View>
        <View className="flex-1 gap-0.5">
          <View className="flex-row justify-between gap-2">
            <Text variant="heading" className="text-base" numberOfLines={1}>
              {item.title}
            </Text>
            {item.product_version && (
              <Badge variant="outline">v{item.product_version}</Badge>
            )}
          </View>
          <Text variant="caption" numberOfLines={2}>
            {stripMarkdown(item.content)}
          </Text>
          {item.published_at && (
            <Text variant="caption" className="text-xs">
              {formatDateRu(item.published_at)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
