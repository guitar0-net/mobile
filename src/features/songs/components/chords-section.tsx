// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ChordDiagram } from "@/features/chords";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";
import { capture } from "@/lib/analytics";

import { type SongDetailChord } from "../queries";
import { SectionHeader } from "./section-header";

type ChordsSectionProps = {
  chords: SongDetailChord[];
};

export function ChordsSection({ chords }: ChordsSectionProps) {
  const {
    chordSize,
    chordOrientation,
    chordVisible,
    setChordSize,
    setChordOrientation,
    setChordVisible,
  } = useDiagramSettings();

  if (!chordVisible) {
    return (
      <View className="mb-4">
        <Button
          variant="outline"
          size="sm"
          className="self-start"
          onPress={() => {
            setChordVisible(true);
            capture("chord_section_visibility_toggled", { visible: true });
          }}
        >
          Показать аккорды
        </Button>
      </View>
    );
  }

  const orientationIcon =
    chordOrientation === "vertical"
      ? { ios: "arrow.clockwise" as const, android: "rotate_right" as const }
      : { ios: "arrow.counterclockwise" as const, android: "rotate_left" as const };

  return (
    <View className="mb-4 gap-2">
      <SectionHeader title="Аккорды">
        <Button
          size="icon-sm"
          variant="ghost"
          icon={orientationIcon}
          onPress={() => {
            const orientation =
              chordOrientation === "horizontal" ? "vertical" : "horizontal";
            setChordOrientation(orientation);
            capture("chord_orientation_toggled", { orientation });
          }}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          icon={{ ios: "minus", android: "remove" }}
          onPress={() => setChordSize((chordSize - 1) as DiagramSize)}
          disabled={chordSize === 1}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          icon={{ ios: "plus", android: "add" }}
          onPress={() => setChordSize((chordSize + 1) as DiagramSize)}
          disabled={chordSize === 5}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          icon={{ ios: "eye.slash", android: "visibility_off" }}
          onPress={() => {
            setChordVisible(false);
            capture("chord_section_visibility_toggled", { visible: false });
          }}
        />
      </SectionHeader>
      <View className="flex-row flex-wrap gap-4">
        {chords.map((chord) => (
          <View key={chord.id} className="items-center">
            <Text variant="caption">{chord.title}</Text>
            <ChordDiagram
              chord={chord}
              orientation={chordOrientation}
              size={chordSize}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
