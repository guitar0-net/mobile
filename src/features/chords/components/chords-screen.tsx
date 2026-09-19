// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useMemo, useRef } from "react";
import { Pressable, SectionList, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";
import { useColors } from "@/lib/themes";

import { useAllChords, type ChordRow, type ChordSection } from "../queries";

const CHORD_WIDTH = {
  vertical: { 1: 101, 2: 115, 3: 130, 4: 144, 5: 173 },
  horizontal: { 1: 133, 2: 189, 3: 244, 4: 289, 5: 355 },
} as const;

// Heights derived from SVG viewBox ratios: horizontal 217×88 (×0.4055), vertical 91×214 (×2.352)
const CHORD_HEIGHT = {
  vertical: { 1: 237, 2: 271, 3: 305, 4: 338, 5: 407 },
  horizontal: { 1: 54, 2: 77, 3: 99, 4: 117, 5: 144 },
} as const;

function ChordCard({
  chord,
  orientation,
  size,
}: {
  chord: ChordRow;
  orientation: "horizontal" | "vertical";
  size: DiagramSize;
}) {
  const colors = useColors();
  const svg =
    orientation === "horizontal"
      ? (chord.svgHorizontal ?? chord.svgVertical)
      : (chord.svgVertical ?? chord.svgHorizontal);
  const width = CHORD_WIDTH[orientation][size];
  const height = CHORD_HEIGHT[orientation][size];

  return (
    <View className="items-center">
      <Text variant="caption">{chord.title}</Text>
      {svg && (
        <SvgXml xml={svg} width={width} height={height} color={colors.foreground} />
      )}
    </View>
  );
}

type SectionListSection = {
  note: ChordSection["note"];
  data: [ChordRow[]];
};

export function ChordsScreen() {
  const { data: sections = [] } = useAllChords();
  const { chordSize, chordOrientation } = useDiagramSettings();
  const listRef = useRef<SectionList<ChordRow[], SectionListSection>>(null);

  const sectionData = useMemo<SectionListSection[]>(
    () => sections.map((s) => ({ note: s.note, data: [s.chords] })),
    [sections],
  );

  return (
    <View className="flex-1 flex-row bg-background">
      <SectionList<ChordRow[], SectionListSection>
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        sections={sectionData}
        keyExtractor={() => "chords"}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <View className="bg-background py-3">
            <Text variant="heading" className="text-xl">
              {section.note}
            </Text>
          </View>
        )}
        renderItem={({ item: chords }) => (
          <View className="flex-row flex-wrap gap-4 pb-6">
            {chords.map((chord) => (
              <ChordCard
                key={chord.id}
                chord={chord}
                orientation={chordOrientation}
                size={chordSize}
              />
            ))}
          </View>
        )}
      />

      <View className="items-center justify-center py-4 pr-2">
        {sections.map((section, index) => (
          <Pressable
            key={section.note}
            onPress={() =>
              listRef.current?.scrollToLocation({
                sectionIndex: index,
                itemIndex: 0,
                animated: true,
              })
            }
            className="px-2 py-0.5"
          >
            <Text className="font-sans-semibold text-xs text-primary">
              {section.note}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
