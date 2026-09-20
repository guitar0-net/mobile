// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { isLessonCompleted } from "@/features/lessons";
import {
  LessonCheckRow,
  markLegacyReviewed,
  useReviewSections,
} from "@/features/migration";
import { useProgress } from "@/features/settings";
import { useColors } from "@/lib/themes";

export default function MigrationScreen() {
  const router = useRouter();
  const colors = useColors();
  const { progress, setLessonCompletion } = useProgress();
  const { data: sections, isPending, isError } = useReviewSections();

  const finish = () => {
    // Clearing the flag is one-way, so keep the review pending when the list
    // never loaded — the user has not had a chance to correct anything yet.
    if (sections !== undefined) markLegacyReviewed();
    router.replace("/(tabs)/home");
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1">
        <ScreenScrollView
          bottomSafeArea={false}
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4 gap-6"
        >
          <View className="gap-2">
            <Text variant="heading" className="text-2xl">
              Прогресс перенесён
            </Text>
            <Text variant="body" className="text-muted-fg">
              Отмеченные уроки мы взяли из прошлой версии приложения. Проверьте список и
              поправьте, если что-то не так — потом это всегда можно изменить на
              странице урока.
            </Text>
          </View>

          {isPending && <ActivityIndicator size="small" color={colors.primary} />}

          {isError && (
            <View className="items-center gap-2">
              <StatusMessage variant="error">
                Не удалось загрузить список уроков.{"\n"}
                Проверим его при следующем запуске.
              </StatusMessage>
            </View>
          )}

          {sections?.map((section) => (
            <View key={section.uuid} className="gap-3">
              <Text variant="caption" className="text-xs uppercase tracking-wider">
                {section.title}
              </Text>
              <View className="gap-2">
                {section.lessons.map((lesson) => {
                  const completed = isLessonCompleted(
                    lesson,
                    progress[lesson.lessonUuid],
                  );
                  return (
                    <LessonCheckRow
                      key={lesson.lessonUuid}
                      order={lesson.order}
                      title={lesson.title}
                      completed={completed}
                      onToggle={() =>
                        setLessonCompletion(
                          {
                            lessonId: lesson.lessonUuid,
                            songIds: lesson.songs.map((song) => song.uuid),
                          },
                          !completed,
                        )
                      }
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </ScreenScrollView>

        <View className="border-t border-border px-4 py-3">
          <Button onPress={finish} disabled={isPending}>
            Продолжить
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}
