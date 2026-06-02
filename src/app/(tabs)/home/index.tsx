// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AnnouncementCard, getAnnouncements } from "@/features/announcements";
import { fetchCourses, MAIN_COURSE_ID, useContinueLesson } from "@/features/lessons";
import { useProgress } from "@/features/settings";
import { useTheme } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";
import { describeRemainingItems, formatTodayRu } from "@/lib/utils";

type LessonInfo = {
  order: number;
  title: string;
  remainingSongs: number;
  videoRemaining: boolean;
  progressPct: number;
  hasProgress: boolean;
};

function FeaturedCourseCard({
  lesson,
  courseTitle,
  onPress,
}: {
  lesson: LessonInfo;
  courseTitle: string;
  onPress?: () => void;
}) {
  const primaryFgColor = THEME_DEFINITIONS[useTheme().theme]["--color-primary-fg"];

  return (
    <View className="gap-3 rounded-2xl bg-primary p-4">
      <View className="gap-1">
        <Text
          className="font-sans text-xs uppercase tracking-wider"
          style={{ color: primaryFgColor }}
        >
          {courseTitle} · Урок {lesson.order}
        </Text>
        <Text className="font-sans-semibold text-2xl" style={{ color: primaryFgColor }}>
          {lesson.title}
        </Text>
        {(lesson.remainingSongs > 0 || lesson.videoRemaining) && (
          <Text
            className="font-sans text-sm"
            style={{ color: primaryFgColor, opacity: 0.8 }}
          >
            {describeRemainingItems(lesson.remainingSongs, lesson.videoRemaining)}
          </Text>
        )}
      </View>

      <View className="bg-primary-fg/20 h-1.5 overflow-hidden rounded-full">
        <View
          className="bg-primary-fg/80 h-full rounded-full"
          style={{ width: `${lesson.progressPct}%` }}
        />
      </View>

      <Button
        variant="inverse"
        size="sm"
        icon={{ ios: "play.fill", android: "play_arrow" }}
        className="self-start"
        onPress={onPress}
      >
        {lesson.hasProgress ? "Продолжить" : "Начать"}
      </Button>
    </View>
  );
}

function CompactCourseCard({
  courseTitle,
  lesson,
  onPress,
}: {
  courseTitle: string;
  lesson: LessonInfo;
  onPress?: () => void;
}) {
  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-4">
      <View className="gap-1">
        <Text variant="caption">
          {courseTitle} · Урок {lesson.order}
        </Text>
        <Text variant="heading">{lesson.title}</Text>
        {(lesson.remainingSongs > 0 || lesson.videoRemaining) && (
          <Text variant="caption">
            {describeRemainingItems(lesson.remainingSongs, lesson.videoRemaining)}
          </Text>
        )}
      </View>
      <Button
        variant="outline"
        size="sm"
        icon={{ ios: "play.fill", android: "play_arrow" }}
        className="self-start"
        onPress={onPress}
      >
        {lesson.hasProgress ? "Продолжить" : "Начать"}
      </Button>
    </View>
  );
}

function CourseContinueCard({
  courseUuid,
  courseTitle,
  variant = "compact",
  onPress,
}: {
  courseUuid: string;
  courseTitle: string;
  variant?: "featured" | "compact";
  onPress?: () => void;
}) {
  const { lesson: row } = useContinueLesson(courseUuid);
  const { progress } = useProgress();

  if (!row) return null;

  const lessonProgress = progress[row.lessonUuid];
  const completedSongs = lessonProgress?.completedSongIds.length ?? 0;
  const videoViewed = lessonProgress?.videoViewed ?? false;
  const lesson: LessonInfo = {
    order: row.order,
    title: row.title,
    remainingSongs: row.songCount - completedSongs,
    videoRemaining: !videoViewed,
    progressPct: Math.round(
      ((completedSongs + (videoViewed ? 1 : 0)) / (row.songCount + 1)) * 100,
    ),
    hasProgress: completedSongs > 0 || videoViewed,
  };

  return variant === "featured" ? (
    <FeaturedCourseCard lesson={lesson} courseTitle={courseTitle} onPress={onPress} />
  ) : (
    <CompactCourseCard courseTitle={courseTitle} lesson={lesson} onPress={onPress} />
  );
}

function AnnouncementsPreview() {
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

export default function HomeScreen() {
  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const otherCourses =
    coursesQuery.data?.filter((c) => c.uuid !== MAIN_COURSE_ID) ?? [];

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6 flex-row items-center justify-between gap-2">
            <View className="flex flex-row items-center gap-2">
              <AppIcon size={32} />
              <Text variant="logo" className="text-4xl text-primary">
                Гитара с нуля
              </Text>
            </View>
            <Button
              variant="ghost"
              size="lg"
              icon={{ ios: "gearshape", android: "settings" }}
            />
          </View>

          <View className="mb-4">
            <Text variant="caption">{formatTodayRu()}</Text>
            <Text variant="heading" className="my-2 text-4xl">
              Привет!
            </Text>
            <View className="flex-row items-center gap-2">
              <Badge variant="outline">1 день подряд</Badge>
              <Badge
                variant="secondary"
                icon={{ ios: "clock", android: "clock_arrow_up" }}
              >
                18 минут сегодня
              </Badge>
            </View>
          </View>

          <CourseContinueCard
            courseUuid={MAIN_COURSE_ID}
            courseTitle="Гитара с нуля"
            variant="featured"
          />

          <AnnouncementsPreview />

          {otherCourses.length > 0 && (
            <View className="mt-6 gap-3">
              <Text variant="heading" className="text-xl">
                Другие курсы
              </Text>
              {otherCourses.map((course) => (
                <CourseContinueCard
                  key={course.uuid}
                  courseUuid={course.uuid}
                  courseTitle={course.title}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
