// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { Button } from "@/components/ui/button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { getAnnouncement } from "@/features/announcements";
import { useColors } from "@/lib/themes";
import { formatDateRu } from "@/lib/utils";

export default function AnnouncementDetailScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const colors = useColors();

  const query = useQuery({
    queryKey: ["announcement", uuid],
    queryFn: () => getAnnouncement(uuid),
  });

  const headingStyle = { color: colors.foreground, fontFamily: "Geist-SemiBold" };
  const markdownStyles = {
    body: { color: colors.foreground, fontSize: 16, lineHeight: 24 },
    heading1: headingStyle,
    heading2: headingStyle,
    heading3: headingStyle,
    code_inline: { backgroundColor: colors.surface, color: colors.foreground },
    fence: { backgroundColor: colors.surface },
    blockquote: { backgroundColor: colors.surface },
    link: { color: colors.primary },
  };

  if (query.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (query.isError || !query.data) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text variant="caption" className="text-center">
          Не удалось загрузить новость
        </Text>
        <Button variant="outline" size="sm" onPress={() => query.refetch()}>
          Повторить
        </Button>
      </View>
    );
  }

  const announcement = query.data;

  return (
    <>
      <Stack.Screen options={{ title: announcement.title }} />
      <ScreenScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-6 pt-4"
      >
        <Text variant="heading" className="mb-1 text-2xl">
          {announcement.title}
        </Text>
        <View className="mb-4 flex-row items-center gap-2">
          <Text variant="caption">{formatDateRu(announcement.created_at)}</Text>
          {announcement.product_version && (
            <Text variant="caption">· v{announcement.product_version}</Text>
          )}
        </View>
        <Markdown style={markdownStyles}>{announcement.content}</Markdown>
      </ScreenScrollView>
    </>
  );
}
