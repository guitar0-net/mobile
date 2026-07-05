// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { useLessonDetail, SongRow, VideoCard } from "@/features/lessons";
import { BookmarkButton } from "@/features/lessons/components/bookmark-button";
import { useProgress } from "@/features/settings";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LessonScreen() {
  const { id, courseId, order, total } = useLocalSearchParams<{
    id: string;
    courseId: string;
    order?: string;
    total?: string;
  }>();
  const { data: lessonDetail } = useLessonDetail(id, courseId);
  const { progress } = useProgress();

  const router = useRouter();
  const completedSongIds = progress[id]?.completedSongIds ?? [];
  let headerTitle = "Урок";
  if (lessonDetail) {
    headerTitle = `Урок ${lessonDetail.lessonOrder} / ${lessonDetail.totalLessonsInCourse}`;
  } else if (order && total) {
    headerTitle = `Урок ${order} / ${total}`;
  }
  const headerRight = useCallback(() => <BookmarkButton lessonId={id} />, [id]);
  const screenOptions = useMemo(
    () => ({ title: headerTitle, headerRight }),
    [headerTitle, headerRight],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScreenScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-6 pt-4"
      >
        {lessonDetail && (
          <View className="gap-2">
            <Text
              variant="caption"
              className="text-xs uppercase tracking-wider text-muted-fg"
            >
              {lessonDetail.courseTitle}
            </Text>
            <Text variant="heading" className="text-2xl">
              {lessonDetail.title}
            </Text>
            {lessonDetail.description && (
              <Text variant="body" className="text-muted-fg">
                {lessonDetail.description}
              </Text>
            )}
            <View className="mt-1 flex-row gap-2">
              {lessonDetail.duration != null && (
                <Badge variant="outline">
                  {formatDuration(lessonDetail.duration)} мин.
                </Badge>
              )}
              {lessonDetail.videoDownloadStatus === "downloaded" && (
                <Badge
                  variant="outline"
                  icon={{ ios: "arrow.down.circle.fill", android: "download_done" }}
                >
                  Offline
                </Badge>
              )}
            </View>

            <VideoCard
              lessonId={id}
              youtubeUrl={lessonDetail.videoUrl}
              dbDownloadStatus={lessonDetail.videoDownloadStatus}
            />

            {lessonDetail.songs.length > 0 && (
              <View className="mt-6">
                <View className="flex-row items-center gap-2">
                  <Text variant="caption" className="text-xs uppercase tracking-wider">
                    Песни в этом уроке
                  </Text>
                  <Badge variant="secondary">{String(lessonDetail.songs.length)}</Badge>
                </View>
                <View className="mt-3 gap-2">
                  {lessonDetail.songs.map((song) => (
                    <SongRow
                      key={song.uuid}
                      title={song.title}
                      completed={completedSongIds.includes(song.uuid)}
                      metronome={song.metronome}
                      onPress={() => router.push(`/song/${song.uuid}`)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScreenScrollView>
    </>
  );
}
