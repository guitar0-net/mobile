// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import {
  SOUND_PRESETS,
  setPattern as setMetronomePattern,
  setSound as setMetronomeSound,
  type BeatAccent,
} from "expo-precision-metronome";
import { useCallback, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import {
  PRESET_SIZES,
  SOUND_LABELS,
  getSizeName,
  getTempoName,
  patternsEqual,
  useMetronomeStore,
} from "@/features/metronome";
import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

type Props = {
  visible: boolean;
  onClose: () => void;
  songBpm: number;
  bpm: number;
  beatPattern: BeatAccent[];
  currentBeat: number;
  isPlaying: boolean;
  onBpmChange: (bpm: number) => Promise<void>;
  onPlayPause: () => Promise<void>;
};

export function SongMetronomeSheet({
  visible,
  onClose,
  songBpm,
  bpm,
  beatPattern,
  currentBeat,
  isPlaying,
  onBpmChange,
  onPlayPause,
}: Props) {
  const { soundPreset, savedPatterns, setSoundPreset, setBeatPattern } =
    useMetronomeStore();
  const tempoName = getTempoName(bpm);
  const sizeName = getSizeName(beatPattern, savedPatterns);

  const handleCyclePattern = useCallback(() => {
    const allPatterns = [
      ...PRESET_SIZES.map((p) => p.pattern),
      ...savedPatterns.map((s) => s.beatPattern),
    ];
    const currentIdx = allPatterns.findIndex((p) => patternsEqual(p, beatPattern));
    const next = allPatterns[(currentIdx + 1) % allPatterns.length];
    setBeatPattern(next);
    if (isPlaying) void setMetronomePattern(next);
  }, [beatPattern, savedPatterns, isPlaying, setBeatPattern]);

  const handleCycleSound = useCallback(() => {
    const currentIdx = SOUND_PRESETS.indexOf(soundPreset);
    const next = SOUND_PRESETS[(currentIdx + 1) % SOUND_PRESETS.length];
    setSoundPreset(next);
    if (isPlaying) void setMetronomeSound(next);
  }, [soundPreset, isPlaying, setSoundPreset]);

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="px-5 pb-8 pt-4">
        <Text variant="heading" className="mb-5 text-lg">
          Метроном
        </Text>

        <View className="mb-5 flex-row flex-wrap items-center gap-2">
          {songBpm > 0 && (
            <Button variant="outline" size="sm" onPress={() => onBpmChange(songBpm)}>
              Темп песни: {songBpm} BPM
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onPress={handleCycleSound}
            icon={{ ios: "speaker.wave.2.fill", android: "volume_up" }}
          >
            {SOUND_LABELS[soundPreset]}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onPress={handleCyclePattern}
            icon={{ ios: "music.note", android: "music_note" }}
          >
            {sizeName}
          </Button>
        </View>

        <View className="mb-4 items-center">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-fg">
            {tempoName}
          </Text>
          <View className="flex-row items-baseline gap-2">
            <Text className="font-sans-semibold text-[72px] leading-tight text-foreground">
              {bpm}
            </Text>
            <Text className="mb-1 text-base text-muted-fg">BPM</Text>
          </View>
        </View>

        <View className="mb-6 items-center">
          <MiniBeatRow pattern={beatPattern} currentBeat={currentBeat} />
        </View>

        <View className="flex-row items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onPress={() => onBpmChange(bpm - 10)}
            className="flex-1"
          >
            −10
          </Button>
          <Button
            variant="outline"
            size="icon"
            onPress={() => onBpmChange(bpm - 1)}
            icon={{ ios: "minus", android: "remove" }}
          />
          <Button
            size="icon"
            onPress={onPlayPause}
            className="h-14 w-14"
            icon={
              isPlaying
                ? { ios: "pause.fill", android: "pause" }
                : { ios: "play.fill", android: "play_arrow" }
            }
          />
          <Button
            variant="outline"
            size="icon"
            onPress={() => onBpmChange(bpm + 1)}
            icon={{ ios: "plus", android: "add" }}
          />
          <Button
            variant="outline"
            size="default"
            onPress={() => onBpmChange(bpm + 10)}
            className="flex-1"
          >
            +10
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

function MiniBeatRow({
  pattern,
  currentBeat,
}: {
  pattern: BeatAccent[];
  currentBeat: number;
}) {
  return (
    <View className="flex-row flex-wrap justify-center gap-2.5">
      {pattern.map((accent, i) => (
        <MiniBeatDot key={i} accent={accent} isActive={currentBeat === i} />
      ))}
    </View>
  );
}

function MiniBeatDot({ accent, isActive }: { accent: BeatAccent; isActive: boolean }) {
  const colors = useColors();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      pulse.value = withSequence(
        withTiming(1, { duration: 30 }),
        withTiming(0, { duration: 130 }),
      );
    }
  }, [isActive, pulse]);

  let baseColor: string;
  if (accent === "strong") baseColor = colors.primary;
  else if (accent === "normal") baseColor = withAlpha(colors.primary, 0.45);
  else baseColor = withAlpha(colors.mutedFg, 0.2);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.3 }],
  }));

  return (
    <Animated.View
      style={[
        { width: 18, height: 18, borderRadius: 9, backgroundColor: baseColor },
        dotStyle,
      ]}
    />
  );
}
