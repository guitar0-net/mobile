// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";
import { useColors } from "@/lib/themes";

import { type SongDetailChord } from "../queries";
import { SectionHeader } from "./section-header";

type ChordsSectionProps = {
  chords: SongDetailChord[];
};

const CHORD_WIDTH = {
  horizontal: [180, 220, 270, 310, 360],
  vertical: [100, 115, 130, 150, 175],
} as const;

const CHORD_HEIGHT = {
  horizontal: [72, 88, 108, 124, 144],
  vertical: [140, 161, 182, 210, 245],
} as const;

function ChordCard({
  chord,
  orientation,
  size,
}: {
  chord: SongDetailChord;
  orientation: "horizontal" | "vertical";
  size: DiagramSize;
}) {
  const colors = useColors();
  const svg =
    orientation === "horizontal"
      ? (chord.svgHorizontal ?? chord.svgVertical)
      : (chord.svgVertical ?? chord.svgHorizontal);
  const idx = size - 1;
  const width = CHORD_WIDTH[orientation][idx];
  const height = CHORD_HEIGHT[orientation][idx];

  return (
    <View className="items-center">
      <Text variant="caption">{chord.title}</Text>
      {svg && (
        <SvgXml xml={svg} width={width} height={height} color={colors.foreground} />
      )}
    </View>
  );
}

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
          onPress={() => setChordVisible(true)}
        >
          Показать аккорды
        </Button>
      </View>
    );
  }

  const orientationIcon =
    chordOrientation === "horizontal"
      ? { ios: "arrow.left.arrow.right" as const, android: "swap_horiz" as const }
      : { ios: "arrow.up.arrow.down" as const, android: "swap_vert" as const };

  return (
    <View className="mb-4 gap-2">
      <SectionHeader title="Аккорды">
        <Button
          size="icon-sm"
          variant="ghost"
          icon={orientationIcon}
          onPress={() =>
            setChordOrientation(
              chordOrientation === "horizontal" ? "vertical" : "horizontal",
            )
          }
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
          onPress={() => setChordVisible(false)}
        />
      </SectionHeader>
      <View className="flex-row flex-wrap gap-4">
        {chords.map((chord) => (
          <ChordCard
            key={chord.id}
            chord={chord}
            orientation={chordOrientation}
            size={chordSize}
          />
        ))}
      </View>
    </View>
  );
}
