// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useLocalSearchParams, Stack } from "expo-router";
import { useCallback, useMemo } from "react";
import { ScrollView, View } from "react-native";

import { CompleteButton, useSongDetail } from "@/features/songs";
import { ChordsSection } from "@/features/songs/components/chords-section";
import { SchemesSection } from "@/features/songs/components/schemes-section";
import { TextSection } from "@/features/songs/components/text-section";

export default function SongScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: songDetail } = useSongDetail(id);

  const headerRight = useCallback(
    () =>
      songDetail?.lessonUuid ? (
        <CompleteButton lessonId={songDetail.lessonUuid} songId={id} />
      ) : null,
    [id, songDetail?.lessonUuid],
  );
  const screenOptions = useMemo(
    () => ({ title: songDetail?.title, headerBackTitle: "К уроку", headerRight }),
    [songDetail, headerRight],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-8 pt-4"
        contentInsetAdjustmentBehavior="automatic"
      >
        {songDetail && (
          <View className="p-2">
            {songDetail.chords.length > 0 && (
              <ChordsSection chords={songDetail.chords} />
            )}
            {songDetail.schemes.length > 0 && (
              <SchemesSection schemes={songDetail.schemes} />
            )}
            <TextSection text={songDetail.text} />
          </View>
        )}
      </ScrollView>
    </>
  );
}
