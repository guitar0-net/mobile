// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useLessonDetail } from "@/features/lessons";
import { useFavorites } from "@/features/settings";
import { useTheme } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LessonScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const { theme } = useTheme();
  const colors = THEME_DEFINITIONS[theme];
  const { data } = useLessonDetail(id, courseId);
  const { favorites, addFavorite, removeFavorite } = useFavorites();

  const router = useRouter();
  const isBookmarked = favorites.includes(id);
  const headerTitle = data
    ? `Урок ${data.lessonOrder} / ${data.totalLessonsInCourse}`
    : "Урок";

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerRight: () => (
            <Pressable
              hitSlop={8}
              onPress={() => (isBookmarked ? removeFavorite(id) : addFavorite(id))}
            >
              <SymbolView
                name={
                  isBookmarked
                    ? { ios: "bookmark.fill", android: "bookmark" }
                    : { ios: "bookmark", android: "bookmark_border" }
                }
                size={22}
                tintColor={colors["--color-foreground"]}
              />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-8 pt-4"
        contentInsetAdjustmentBehavior="automatic"
      >
        {data && (
          <View className="gap-2">
            <Text
              variant="caption"
              className="text-xs uppercase tracking-wider text-muted-fg"
            >
              {data.courseTitle}
            </Text>
            <Text variant="heading" className="text-2xl">
              {data.title}
            </Text>
            {data.description && (
              <Text variant="body" className="text-muted-fg">
                {data.description}
              </Text>
            )}
            <View className="mt-1 flex-row gap-2">
              {data.duration != null && (
                <Badge variant="outline">{formatDuration(data.duration)}</Badge>
              )}
              {data.videoDownloadStatus === "downloaded" && (
                <Badge
                  variant="outline"
                  icon={{ ios: "arrow.down.circle.fill", android: "download_done" }}
                >
                  Offline
                </Badge>
              )}
            </View>

            <Pressable
              className="mt-4 overflow-hidden rounded-xl bg-zinc-900"
              onPress={() => router.push(`/video/${id}`)}
            >
              <View className="h-48 items-center justify-center">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20">
                  <SymbolView
                    name={{ ios: "play.fill", android: "play_arrow" }}
                    size={32}
                    tintColor="#FFFFFF"
                  />
                </View>
              </View>
              <View className="flex-row items-center justify-between px-4 py-3">
                <Text className="text-sm text-white/70">
                  {data.localVideoPath
                    ? "Video lesson · guitar0.net · downloaded"
                    : "Video lesson · guitar0.net · online"}
                </Text>
                <Pressable hitSlop={8} onPress={() => {}}>
                  <SymbolView
                    name={{ ios: "arrow.down.to.line", android: "download" }}
                    size={20}
                    tintColor="rgba(255,255,255,0.7)"
                  />
                </Pressable>
              </View>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </>
  );
}
