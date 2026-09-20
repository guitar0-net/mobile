// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ChipBar } from "@/components/ui/chip-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { useDiagramSettings } from "@/features/settings";

import { useChordIndex, useChordsByTitle, type Note } from "../queries";
import { ChordDiagram } from "./chord-diagram";

export function ChordsScreen() {
  const { data: index = [] } = useChordIndex();
  const { chordSize, chordOrientation } = useDiagramSettings();
  const [pickedNote, setPickedNote] = useState<Note | null>(null);
  const [pickedVariant, setPickedVariant] = useState("");

  const group = index.find((entry) => entry.note === pickedNote) ?? index[0];
  const variants = group?.variants ?? [];
  const variant = variants.includes(pickedVariant)
    ? pickedVariant
    : (variants[0] ?? "");
  const title = group ? group.note + variant : "";

  const { data: chords = [] } = useChordsByTitle(title);

  const shownTitle = chords[0]?.title ?? title;
  const musicalTitle = chords[0]?.musicalTitle;
  const heading = musicalTitle ? `${shownTitle} · ${musicalTitle}` : shownTitle;

  if (!group) {
    return (
      <SafeAreaView
        edges={["bottom"]}
        className="flex-1 items-center justify-center gap-3 bg-background px-8"
      >
        <StatusMessage variant="warning">
          Аккорды ещё не загружены. Они появятся после первой синхронизации.
        </StatusMessage>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-background">
      <View className="gap-3 px-4 py-3">
        <SegmentedControl
          options={index.map((entry) => ({ label: entry.note, value: entry.note }))}
          value={group.note}
          onChange={setPickedNote}
        />
        <ChipBar
          testID="chord-variants"
          options={variants.map((item) => ({
            label: item === "" ? group.note : item,
            value: item,
          }))}
          value={variant}
          onChange={setPickedVariant}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Text testID="chord-title" variant="heading" className="mb-4 text-center">
          {heading}
        </Text>
        <View className="flex-row flex-wrap justify-center gap-4">
          {chords.map((chord) => (
            <ChordDiagram
              key={chord.id}
              chord={chord}
              orientation={chordOrientation}
              size={chordSize}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
