// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { AnnouncementsPreview } from "@/features/announcements";
import { CourseContinueCard, fetchCourses, MAIN_COURSE_ID } from "@/features/lessons";
import { formatTodayRu } from "@/lib/utils";

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
        <ScreenScrollView className="flex-1" contentContainerClassName="px-4 pb-6">
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
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}
