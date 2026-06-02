// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, View } from "react-native";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { AnnouncementCard } from "@/features/announcements";
import { getAnnouncements, type AnnouncementItem } from "@/features/announcements";

const PAGE_SIZE = 10;

export default function AnnouncementsScreen() {
  const router = useRouter();

  const query = useInfiniteQuery({
    queryKey: ["announcements", "list"],
    queryFn: ({ pageParam }) => getAnnouncements(PAGE_SIZE, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const fetched = allPages.reduce((sum, p) => sum + p.results.length, 0);
      return fetched < lastPage.count ? fetched : undefined;
    },
  });

  const items: AnnouncementItem[] = query.data?.pages.flatMap((p) => p.results) ?? [];

  if (query.isError && items.length === 0) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <StatusMessage variant="error">Не удалось загрузить новости</StatusMessage>
        <Button variant="outline" size="sm" onPress={() => query.refetch()}>
          Повторить
        </Button>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-3"
      contentInsetAdjustmentBehavior="automatic"
      data={items}
      keyExtractor={(item) => item.uuid}
      renderItem={({ item }) => (
        <AnnouncementCard
          item={item}
          onPress={() => router.push(`/home/announcements/${item.uuid}`)}
        />
      )}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) {
          query.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        query.isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null
      }
    />
  );
}
