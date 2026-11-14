// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Platform, Text, View, type TextStyle } from "react-native";

type Segment = { chord: string | null; text: string };

type ChordLineProps = {
  line: string;
  chordStyle: TextStyle;
  lyricStyle: TextStyle;
};

export function ChordLine({ line, chordStyle, lyricStyle }: ChordLineProps) {
  return (
    <View className="my-2.5 w-full flex-row flex-wrap">
      {splitWords(line).map((word, wordIndex) => (
        <View key={wordIndex} testID="chord-word" className="flex-row">
          {word.map((segment, segmentIndex) => (
            <View key={segmentIndex}>
              <Text style={chordStyle}>{segment.chord ?? NBSP}</Text>
              <Text style={[lyricStyle, ANDROID_LYRIC_FONT]}>{segment.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const NBSP = "\u00a0";

// Android "Bold text" thickens only text without an explicit font, after React Native measured it,
// so a syllable sized to its own width loses its last letters.
const ANDROID_LYRIC_FONT = Platform.select<TextStyle>({
  android: { fontFamily: "sans-serif" },
});

function splitWords(line: string): Segment[][] {
  const words = line.trim().match(/(?:\[[^\]]*\]|\S)+/g) ?? [];
  return words.map((word, index) => {
    const isLast = index === words.length - 1;
    return splitSegments(isLast ? word : `${word} `);
  });
}

function splitSegments(word: string): Segment[] {
  const [leading, ...rest] = word.split(/\[([^\]]*)\]/);
  const segments: Segment[] = leading ? [{ chord: null, text: leading }] : [];
  for (let i = 0; i < rest.length; i += 2) {
    segments.push({ chord: rest[i], text: rest[i + 1] });
  }
  return segments;
}
