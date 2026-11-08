// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import {
  AdditionLessonsList,
  LessonStatus,
  LessonSwipeNavigator,
  SongRow,
  useLessonDetail,
  VideoCard,
} from "@/features/lessons";
import type { CourseLessonRow } from "@/features/lessons";
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
  const completedSongCount = (lessonDetail?.songs ?? []).filter((song) =>
    completedSongIds.includes(song.uuid),
  ).length;
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
  const showLesson = useCallback(
    (lesson: CourseLessonRow) =>
      router.setParams({ id: lesson.lessonUuid, order: String(lesson.order) }),
    [router],
  );

  return (
    <LessonSwipeNavigator lessonId={id} courseId={courseId} onNavigate={showLesson}>
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
            <View className="mt-1 flex-row flex-wrap gap-2">
              {lessonDetail.duration != null && (
                <Badge variant="outline">
                  {formatDuration(lessonDetail.duration)} мин.
                </Badge>
              )}
              {lessonDetail.videoDownloadStatus === "downloaded" && (
                <Badge
                  variant="outline"
                  icon={{ ios: "arrow.down.to.line", android: "download" }}
                >
                  Offline
                </Badge>
              )}
              <LessonStatus lessonId={id} songCount={lessonDetail.songs.length} />
            </View>

            <VideoCard
              lessonId={id}
              title={lessonDetail.title}
              youtubeUrl={lessonDetail.videoUrl}
              dbDownloadStatus={lessonDetail.videoDownloadStatus}
            />

            {lessonDetail.songs.length > 0 && (
              <View className="mt-6">
                <View className="flex-row items-center gap-2">
                  <Text variant="caption" className="text-xs uppercase tracking-wider">
                    Песни в этом уроке
                  </Text>
                  <Badge variant="secondary">
                    {completedSongCount} / {lessonDetail.songs.length}
                  </Badge>
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

            <AdditionLessonsList lessons={lessonDetail.additionLessons} />
          </View>
        )}
      </ScreenScrollView>
    </LessonSwipeNavigator>
  );
}
