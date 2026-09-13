// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";
import { capture } from "@/lib/analytics";
import { useColors } from "@/lib/themes";

import { type SongDetailChord } from "../queries";
import { SectionHeader } from "./section-header";

type ChordsSectionProps = {
  chords: SongDetailChord[];
};

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
  chord: SongDetailChord;
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
