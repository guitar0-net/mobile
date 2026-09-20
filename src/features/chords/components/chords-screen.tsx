// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useMemo, useRef } from "react";
import { Pressable, SectionList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";

import { useAllChords, type ChordRow, type ChordSection } from "../queries";
import { ChordDiagram } from "./chord-diagram";

function ChordCard({
  chord,
  orientation,
  size,
}: {
  chord: ChordRow;
  orientation: "horizontal" | "vertical";
  size: DiagramSize;
}) {
  return (
    <View className="items-center">
      <Text variant="caption">{chord.title}</Text>
      <ChordDiagram chord={chord} orientation={orientation} size={size} />
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
    <SafeAreaView edges={["bottom"]} className="flex-1 flex-row bg-background">
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
    </SafeAreaView>
  );
}
