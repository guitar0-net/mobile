// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import {
  computeCourseProgress,
  deriveLessonState,
  fetchCourses,
  fetchCourseLessons,
  MAIN_COURSE_ID,
  useContinueLesson,
} from "@/features/lessons";
import { CourseProgressCard } from "@/features/lessons/components/CourseProgressCard";
import { LessonListItem } from "@/features/lessons/components/LessonListItem";
import { useHideCompletedLessons, useProgress } from "@/features/settings";
import { cn } from "@/lib/utils";

export default function LessonsScreen() {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState(MAIN_COURSE_ID);
  const { progress } = useProgress();
  const { hideCompletedLessons, setHideCompletedLessons } = useHideCompletedLessons();

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const lessonsQuery = useQuery({
    queryKey: ["course-lessons", selectedCourse],
    queryFn: () => fetchCourseLessons(selectedCourse),
    enabled: selectedCourse.length > 0,
  });

  const { lesson: continueLesson } = useContinueLesson(selectedCourse);

  const courses = coursesQuery.data
    ? [
        ...coursesQuery.data.filter((c) => c.uuid === MAIN_COURSE_ID),
        ...coursesQuery.data.filter((c) => c.uuid !== MAIN_COURSE_ID),
      ]
    : [];

  const selectedCourseTitle =
    courses.find((c) => c.uuid === selectedCourse)?.title ?? "";
  const allLessons = lessonsQuery.data ?? [];
  const courseProgress = computeCourseProgress(allLessons, progress);

  const lessonsWithState = allLessons.map((lesson) => ({
    lesson,
    state: deriveLessonState(
      lesson,
      progress[lesson.lessonUuid],
      continueLesson?.lessonUuid ?? null,
    ),
  }));

  const visibleLessons = hideCompletedLessons
    ? lessonsWithState.filter(({ state }) => state !== "completed")
    : lessonsWithState;
  const hiddenCount = allLessons.length - visibleLessons.length;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-6"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-4 pt-2">
            <Text variant="heading" className="text-4xl">
              Уроки
            </Text>
          </View>

          {courses.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mt-4"
              contentContainerClassName="px-4 gap-2"
            >
              {courses.map((course) => (
                <Pressable
                  key={course.uuid}
                  onPress={() => setSelectedCourse(course.uuid)}
                  className={cn(
                    "rounded-full px-4 py-2",
                    selectedCourse === course.uuid
                      ? "bg-primary"
                      : "border border-border bg-surface",
                  )}
                >
                  <Text
                    variant="body"
                    className={cn(
                      "font-sans-semibold text-sm",
                      selectedCourse === course.uuid
                        ? "text-primary-fg"
                        : "text-foreground",
                    )}
                  >
                    {course.title}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          {allLessons.length > 0 && (
            <View className="mt-4 px-4">
              <CourseProgressCard
                courseTitle={selectedCourseTitle}
                completed={courseProgress.completed}
                total={courseProgress.total}
                pct={courseProgress.pct}
              />
            </View>
          )}

          <View className="mt-6 flex-row items-center justify-between px-4">
            <Text variant="heading" className="text-xl">
              Уроки
            </Text>
            <Pressable onPress={() => setHideCompletedLessons(!hideCompletedLessons)}>
              <Text
                variant="caption"
                className={cn("text-sm", hideCompletedLessons && "text-primary")}
              >
                {hideCompletedLessons ? "Показать пройденные" : "Скрыть пройденные"}
              </Text>
            </Pressable>
          </View>

          {hideCompletedLessons && hiddenCount > 0 && (
            <View className="mt-2 px-4">
              <Text variant="caption">Скрыто {hiddenCount} уроков</Text>
            </View>
          )}

          <View className="mt-3 gap-2 px-4">
            {visibleLessons.map(({ lesson, state }) => (
              <LessonListItem
                key={lesson.lessonUuid}
                lesson={lesson}
                state={state}
                onPress={() =>
                  router.push(`/lesson/${lesson.lessonUuid}?courseId=${selectedCourse}`)
                }
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
