// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { AnnouncementCard } from "./announcement-card";
import { getAnnouncements } from "./api";

export function AnnouncementsPreview() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["announcements", "preview"],
    queryFn: () => getAnnouncements(3, 0),
  });

  return (
    <View className="mt-6 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="gap-0.5">
          <Text
            variant="caption"
            className="text-xs uppercase tracking-wider text-primary"
          >
            Обновления
          </Text>
          <Text variant="heading" className="text-xl">
            Что нового
          </Text>
        </View>
        <Button variant="link" onPress={() => router.push("/home/announcements")}>
          Все
        </Button>
      </View>

      {query.isError && (
        <View className="items-center gap-3 rounded-xl border border-border bg-surface py-6">
          <Text variant="caption" className="text-center">
            Не удалось загрузить новости
          </Text>
          <Button variant="outline" size="sm" onPress={() => query.refetch()}>
            Повторить
          </Button>
        </View>
      )}

      {query.data?.results.map((item) => (
        <AnnouncementCard
          key={item.uuid}
          item={item}
          onPress={() => router.push(`/home/announcements/${item.uuid}`)}
        />
      ))}
    </View>
  );
}
