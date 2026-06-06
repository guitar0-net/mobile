// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";
import { SvgXml } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

import { SongDetailChord } from "../queries";

type ChordsSectionProps = {
  chords: SongDetailChord[];
};

function ChordCard({ chord }: { chord: SongDetailChord }) {
  const colors = useColors();

  return (
    <View className="items-center">
      <Text variant="caption">{chord.title}</Text>
      {chord.svgHorizontal && (
        <SvgXml
          xml={chord.svgHorizontal}
          width={150}
          height={60}
          color={colors.foreground}
        />
      )}
    </View>
  );
}

export function ChordsSection({ chords }: ChordsSectionProps) {
  return (
    <View className="mb-4 gap-2">
      <Text variant="heading">Аккорды</Text>
      <View className="flex-row flex-wrap gap-4">
        {chords.map((chord) => (
          <ChordCard key={chord.id} chord={chord} />
        ))}
      </View>
    </View>
  );
}
