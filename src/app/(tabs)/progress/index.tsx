// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import {
  ActivityGrid,
  ActivityStatCards,
  LessonTimeline,
  ProfileHeader,
  useActivityHistory,
  useActivityStreak,
  useActivityTimeline,
  useActivityTotalTime,
} from "@/features/activity";
import { DonationSupportCard } from "@/features/donations";
import { useCompletedLessonsCount } from "@/features/lessons";

const MONTHS_BACK = 12;
const END_REACHED_THRESHOLD_PX = 200;

export default function ProgressScreen() {
  const { currentStreak } = useActivityStreak();
  const totalSeconds = useActivityTotalTime();
  const lessonsCompleted = useCompletedLessonsCount();
  const history = useActivityHistory(MONTHS_BACK);
  const { entries, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useActivityTimeline();

  const handleScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);

      if (
        distanceFromBottom < END_REACHED_THRESHOLD_PX &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScreenScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-6"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <Text variant="heading" className="mb-4 text-4xl">
            Профиль
          </Text>

          <ProfileHeader />

          <ActivityStatCards
            streakDays={currentStreak}
            lessonsCompleted={lessonsCompleted}
            totalSeconds={totalSeconds}
          />

          <View className="mt-4">
            <ActivityGrid history={history} />
          </View>

          <DonationSupportCard />

          <Text variant="heading" className="mb-2 mt-6 text-xl">
            Журнал занятий
          </Text>
          <LessonTimeline entries={entries} isLoadingMore={isFetchingNextPage} />
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}
