// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { fetchCourses, useContinueLesson, type CourseLessonRow } from "@/lib/lessons";
import { useProgress, type LessonProgress } from "@/lib/settings";
import { useTheme } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";
import { formatTodayRu } from "@/lib/utils";

const MAIN_COURSE_ID = "6236a799-32b4-4e98-b9b2-9ade9ba83b47";

function pluralSongs(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} песен`;
  if (mod10 === 1) return `${n} песня`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} песни`;
  return `${n} песен`;
}

type LessonCardProps = {
  lesson: CourseLessonRow;
  lessonProgress: LessonProgress | undefined;
  label?: string;
};

function LessonCard({ lesson, lessonProgress, label }: LessonCardProps) {
  const { theme } = useTheme();
  const primaryColor = THEME_DEFINITIONS[theme]["--color-primary"];
  const primaryFgColor = THEME_DEFINITIONS[theme]["--color-primary-fg"];

  const completedSongs = lessonProgress?.completedSongIds.length ?? 0;
  const videoViewed = lessonProgress?.videoViewed ?? false;
  const remainingSongs = lesson.songCount - completedSongs;
  const totalItems = lesson.songCount + 1;
  const completedItems = completedSongs + (videoViewed ? 1 : 0);
  const progressPct = Math.round((completedItems / totalItems) * 100);

  return (
    <View className="gap-3 rounded-2xl bg-primary p-4">
      <View className="gap-1">
        <Text
          className="font-sans text-xs uppercase tracking-wider"
          style={{ color: primaryFgColor }}
        >
          {label ?? "Продолжить"} · Урок {lesson.order}
        </Text>
        <Text className="font-sans-semibold text-2xl" style={{ color: primaryFgColor }}>
          {lesson.title}
        </Text>
        {remainingSongs > 0 && (
          <Text
            className="font-sans text-sm"
            style={{ color: primaryFgColor, opacity: 0.8 }}
          >
            осталось {pluralSongs(remainingSongs)}
          </Text>
        )}
      </View>

      <View className="bg-primary-fg/20 h-1.5 overflow-hidden rounded-full">
        <View
          className="bg-primary-fg/80 h-full rounded-full"
          style={{ width: `${progressPct}%` }}
        />
      </View>

      <Pressable
        style={({ pressed }) => ({
          height: 36,
          borderRadius: 18,
          paddingHorizontal: 20,
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: primaryFgColor,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <SymbolView
          name={{ ios: "play.fill", android: "play_arrow" }}
          size={14}
          tintColor={primaryColor}
        />
        <Text className="font-sans-semibold text-sm" style={{ color: primaryColor }}>
          Продолжить
        </Text>
      </Pressable>
    </View>
  );
}

function CourseContinueCard({
  courseUuid,
  courseTitle,
}: {
  courseUuid: string;
  courseTitle: string;
}) {
  const { lesson } = useContinueLesson(courseUuid);
  const { progress } = useProgress();

  if (!lesson) return null;

  const lessonProgress = progress[lesson.lessonUuid];
  const remainingSongs =
    lesson.songCount - (lessonProgress?.completedSongIds.length ?? 0);

  return (
    <View className="gap-1 rounded-xl border border-border bg-surface p-4">
      <Text variant="caption">
        {courseTitle} · Урок {lesson.order}
      </Text>
      <Text variant="heading">{lesson.title}</Text>
      {remainingSongs > 0 && (
        <Text variant="caption">осталось {pluralSongs(remainingSongs)}</Text>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const { lesson } = useContinueLesson(MAIN_COURSE_ID);
  const { progress } = useProgress();

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

          {lesson && (
            <LessonCard lesson={lesson} lessonProgress={progress[lesson.lessonUuid]} />
          )}

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
