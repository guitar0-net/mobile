// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { type ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/app-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { useActivityStreak } from "@/features/activity";
import { AnnouncementsPreview } from "@/features/announcements";
import { fetchChordsCount } from "@/features/chords";
import { CourseContinueCard, fetchCourses, MAIN_COURSE_ID } from "@/features/lessons";
import { useMetronomeStore } from "@/features/metronome";
import { TUNINGS, useTunerStore } from "@/features/tuner";
import { useColors } from "@/lib/themes";
import { cn, formatTodayRu, pluralRu } from "@/lib/utils";

type ToolCardProps = {
  icon: ComponentProps<typeof SymbolView>["name"];
  label: string;
  subtitle: string;
  onPress: () => void;
  color: "brand-red" | "brand-amber" | "brand-brown";
};

function ToolCard({ icon, label, subtitle, onPress, color }: ToolCardProps) {
  const { primaryFg } = useColors();

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "flex-1 rounded-2xl p-4 active:opacity-70",
        color === "brand-red" && "bg-brand-red",
        color === "brand-amber" && "bg-brand-amber",
        color === "brand-brown" && "bg-brand-brown",
      )}
    >
      <SymbolView name={icon} size={28} tintColor={primaryFg} />
      <View className="mt-3">
        <Text className="font-sans-semibold text-primary-fg">{label}</Text>
        <Text className="text-sm text-primary-fg opacity-70">{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { currentStreak, todaySeconds } = useActivityStreak();
  const metronomeBpm = useMetronomeStore((s) => s.bpm);
  const tunerTuningId = useTunerStore((s) => s.tuningId);
  const tunerShortLabel = (TUNINGS.find((t) => t.id === tunerTuningId) ?? TUNINGS[0])
    .shortLabel;
  const chordsCountQuery = useQuery({
    queryKey: ["chords", "count"],
    queryFn: fetchChordsCount,
  });
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
            <View className="flex flex-1 flex-row items-center gap-2">
              <AppIcon size={32} />
              <Text variant="logo" className="flex-1 text-4xl leading-snug">
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
              <Badge variant="outline">
                {pluralRu(currentStreak, "день", "дня", "дней")} подряд
              </Badge>
              <Badge
                variant="secondary"
                icon={{ ios: "clock", android: "clock_arrow_up" }}
              >
                {pluralRu(Math.floor(todaySeconds / 60), "минута", "минуты", "минут")}{" "}
                сегодня
              </Badge>
            </View>
          </View>

          <CourseContinueCard
            courseUuid={MAIN_COURSE_ID}
            courseTitle="Гитара с нуля"
            variant="featured"
          />

          <View className="mt-4 flex-row gap-3">
            <ToolCard
              icon={{ ios: "metronome.fill", android: "timer" }}
              label="Метроном"
              subtitle={`${metronomeBpm} BPM`}
              color="brand-red"
              onPress={() => router.push("/metronome")}
            />
            <ToolCard
              icon={{ ios: "tuningfork", android: "music_note" }}
              label="Тюнер"
              subtitle={tunerShortLabel}
              color="brand-amber"
              onPress={() => router.push("/tuner")}
            />
            <ToolCard
              icon={{ ios: "music.note.list", android: "library_music" }}
              label="Аккорды"
              subtitle={
                chordsCountQuery.data != null
                  ? pluralRu(chordsCountQuery.data, "аккорд", "аккорда", "аккордов")
                  : "—"
              }
              color="brand-brown"
              onPress={() => router.push("/chords")}
            />
          </View>

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
