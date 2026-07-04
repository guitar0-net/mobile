// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { ScrollView, View } from "react-native";

import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { CompleteButton, useSongDetail } from "@/features/songs";
import { ChordsSection } from "@/features/songs/components/chords-section";
import { SchemesSection } from "@/features/songs/components/schemes-section";
import { SongToolbar } from "@/features/songs/components/song-toolbar";
import { TextSection } from "@/features/songs/components/text-section";
import { useAutoScroll } from "@/features/songs/use-auto-scroll";

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: songDetail } = useSongDetail(id);
  const scrollRef = useRef<ScrollView>(null);
  const {
    speedIndex,
    cycleSpeed,
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  } = useAutoScroll(scrollRef);

  const headerRight = useCallback(
    () =>
      songDetail?.lessonUuid ? (
        <CompleteButton lessonId={songDetail.lessonUuid} songId={id} />
      ) : null,
    [id, songDetail?.lessonUuid],
  );
  const headerTitle = songDetail?.title ?? "Песня";
  const screenOptions = useMemo(
    () => ({ title: headerTitle, headerBackTitle: "К уроку", headerRight }),
    [headerTitle, headerRight],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <View className="flex-1 bg-background">
        <ScreenScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-4 pb-6 pt-4"
          onScroll={onScroll}
          onScrollBeginDrag={onScrollBeginDrag}
          onScrollEndDrag={onScrollEndDrag}
          onMomentumScrollBegin={onMomentumScrollBegin}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
        >
          {songDetail && (
            <View>
              {songDetail.chords.length > 0 && (
                <ChordsSection chords={songDetail.chords} />
              )}
              {songDetail.schemes.length > 0 && (
                <SchemesSection schemes={songDetail.schemes} />
              )}
              <TextSection text={songDetail.text} />
            </View>
          )}
        </ScreenScrollView>
        {songDetail && (
          <SongToolbar
            songBpm={songDetail.metronome}
            autoScrollSpeedIndex={speedIndex}
            onAutoScrollCycle={cycleSpeed}
            songUuid={songDetail.uuid}
            hasChords={songDetail.chords.length > 0}
            hasSchemes={songDetail.schemes.length > 0}
          />
        )}
      </View>
    </>
  );
}
