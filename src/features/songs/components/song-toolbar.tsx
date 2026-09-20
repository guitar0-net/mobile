// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ExpoPrecisionMetronomeModule, {
  setBpm as setMetronomeBpm,
  setPattern as setMetronomePattern,
  setSound as setMetronomeSound,
  start,
  stop,
} from "expo-precision-metronome";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { clampBpm, useMetronomeStore } from "@/features/metronome";
import { capture } from "@/lib/analytics";
import { useColors } from "@/lib/themes";
import { cn, withAlpha } from "@/lib/utils";

import { SongMetronomeSheet } from "./song-metronome-sheet";
import { SongPrintSheet } from "./song-print-sheet";

const SPEED_LABELS = ["", "1×", "2×", "3×"];

type Props = {
  songBpm: number;
  autoScrollSpeedIndex: number;
  onAutoScrollCycle: () => void;
  songUuid: string;
  hasChords: boolean;
  hasSchemes: boolean;
};

export function SongToolbar({
  songBpm,
  autoScrollSpeedIndex,
  onAutoScrollCycle,
  songUuid,
  hasChords,
  hasSchemes,
}: Props) {
  const {
    beatPattern,
    soundPreset,
    isPlaying,
    currentBeat,
    setIsPlaying,
    setCurrentBeat,
  } = useMetronomeStore();

  const [bpm, setBpm] = useState(() =>
    clampBpm(songBpm > 0 ? songBpm : useMetronomeStore.getState().bpm),
  );

  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [printSheetVisible, setPrintSheetVisible] = useState(false);

  const beatPatternRef = useRef(beatPattern);
  useEffect(() => {
    beatPatternRef.current = beatPattern;
  }, [beatPattern]);

  const soundPresetRef = useRef(soundPreset);
  useEffect(() => {
    soundPresetRef.current = soundPreset;
  }, [soundPreset]);

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const beatSub = ExpoPrecisionMetronomeModule.addListener("onBeat", ({ beat }) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setCurrentBeat(beat % beatPatternRef.current.length);
      flashTimerRef.current = setTimeout(() => setCurrentBeat(-1), 100);
    });
    const playbackSub = ExpoPrecisionMetronomeModule.addListener(
      "onPlaybackChange",
      ({ state }) => {
        setIsPlaying(state === "running");
      },
    );
    return () => {
      beatSub.remove();
      playbackSub.remove();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      void stop();
      setIsPlaying(false);
    };
  }, [setCurrentBeat, setIsPlaying]);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await stop();
      setIsPlaying(false);
    } else {
      await start(bpm);
      await setMetronomePattern(beatPatternRef.current);
      await setMetronomeSound(soundPresetRef.current);
      setIsPlaying(true);
      capture("metronome_started", {
        bpm,
        beats: beatPatternRef.current.length,
        sound: soundPresetRef.current,
        source: "song_toolbar",
      });
    }
  }, [isPlaying, bpm, setIsPlaying]);

  const handleBpmChange = useCallback(
    async (newBpm: number) => {
      const clamped = clampBpm(newBpm);
      setBpm(clamped);
      if (isPlaying) await setMetronomeBpm(clamped);
    },
    [isPlaying],
  );

  const beatPulse = useSharedValue(0);

  useEffect(() => {
    if (currentBeat >= 0) {
      beatPulse.value = withSequence(
        withTiming(1, { duration: 30 }),
        withTiming(0, { duration: 130 }),
      );
    }
  }, [currentBeat, beatPulse]);

  const beatDotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + beatPulse.value * 0.35 }],
  }));

  const currentAccent = beatPattern[currentBeat];
  let dotColor: string;
  if (!isPlaying || currentBeat < 0 || !currentAccent) {
    dotColor = withAlpha(colors.primary, 0.3);
  } else if (currentAccent === "strong") {
    dotColor = colors.primary;
  } else if (currentAccent === "normal") {
    dotColor = withAlpha(colors.primary, 0.55);
  } else {
    dotColor = withAlpha(colors.mutedFg, 0.25);
  }

  return (
    <>
      <View
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="border-t border-border bg-background px-4 pt-3"
      >
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center overflow-hidden rounded-full border border-border">
            <Pressable
              onLongPress={() => setSheetVisible(true)}
              delayLongPress={400}
              className="flex-row items-center gap-2.5 px-4 py-3"
            >
              <Animated.View
                style={[
                  { width: 14, height: 14, borderRadius: 7, backgroundColor: dotColor },
                  beatDotStyle,
                ]}
              />
              <Text className="font-sans-semibold text-base text-foreground">
                {bpm}
              </Text>
              <Text className="text-sm text-muted-fg">BPM</Text>
            </Pressable>
            <Button
              size="icon"
              onPress={handlePlayPause}
              className="m-1.5"
              icon={
                isPlaying
                  ? { ios: "pause.fill", android: "pause" }
                  : { ios: "play.fill", android: "play_arrow" }
              }
            />
          </View>

          <Pressable
            onPress={onAutoScrollCycle}
            accessibilityLabel={
              autoScrollSpeedIndex > 0
                ? `Автопрокрутка ${SPEED_LABELS[autoScrollSpeedIndex]}`
                : "Автопрокрутка"
            }
            className={cn(
              "h-14 w-14 items-center justify-center rounded-full border",
              autoScrollSpeedIndex > 0 ? "border-primary" : "border-border",
            )}
          >
            {autoScrollSpeedIndex === 0 ? (
              <SymbolView
                name={{ ios: "arrow.down", android: "arrow_downward" }}
                size={20}
                tintColor={colors.foreground}
              />
            ) : (
              <Text className="font-sans-semibold text-base text-primary">
                {SPEED_LABELS[autoScrollSpeedIndex]}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setPrintSheetVisible(true)}
            accessibilityLabel="Печать"
            className="h-14 w-14 items-center justify-center rounded-full border border-border"
          >
            <SymbolView
              name={{ ios: "printer", android: "print" }}
              size={22}
              tintColor={colors.foreground}
            />
          </Pressable>
        </View>
      </View>

      <SongPrintSheet
        visible={printSheetVisible}
        onClose={() => setPrintSheetVisible(false)}
        songUuid={songUuid}
        hasChords={hasChords}
        hasSchemes={hasSchemes}
      />

      <SongMetronomeSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        songBpm={songBpm}
        bpm={bpm}
        beatPattern={beatPattern}
        currentBeat={currentBeat}
        isPlaying={isPlaying}
        onBpmChange={handleBpmChange}
        onPlayPause={handlePlayPause}
      />
    </>
  );
}
