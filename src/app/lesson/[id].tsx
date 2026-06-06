// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { useLessonDetail, SongRow } from "@/features/lessons";
import { BookmarkButton } from "@/features/lessons/components/BookmarkButton";
import { useProgress } from "@/features/settings";
import { useColors } from "@/lib/themes";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LessonScreen() {
  const { id, courseId } = useLocalSearchParams<{ id: string; courseId: string }>();
  const colors = useColors();
  const { data } = useLessonDetail(id, courseId);
  const { progress } = useProgress();

  const router = useRouter();
  const completedSongIds = progress[id]?.completedSongIds ?? [];
  const headerTitle = data
    ? `Урок ${data.lessonOrder} / ${data.totalLessonsInCourse}`
    : "Урок";
  const headerRight = useCallback(() => <BookmarkButton lessonId={id} />, [id]);
  const screenOptions = useMemo(
    () => ({ title: headerTitle, headerRight }),
    [headerTitle, headerRight],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
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
                <Badge variant="outline">{formatDuration(data.duration)} мин.</Badge>
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

            {data.songs.length > 0 && (
              <View className="mt-6">
                <View className="flex-row items-center gap-2">
                  <Text variant="caption" className="text-xs uppercase tracking-wider">
                    Песни в этом уроке
                  </Text>
                  <Badge variant="secondary">{String(data.songs.length)}</Badge>
                </View>
                <View className="mt-3 gap-2">
                  {data.songs.map((song) => (
                    <SongRow
                      key={song.uuid}
                      title={song.title}
                      completed={completedSongIds.includes(song.uuid)}
                      metronome={song.metronome}
                      onPress={() => console.log(song.uuid)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </>
  );
}
