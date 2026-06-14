// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import ExpoPrecisionMetronomeModule, {
  setBpm as setMetronomeBpm,
  setPattern as setMetronomePattern,
  setSound as setMetronomeSound,
  start,
  stop,
  type BeatAccent,
  type SoundPreset,
} from "expo-precision-metronome";
import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { SettingsRow } from "@/components/ui/settings-row";
import { Text } from "@/components/ui/text";
import {
  BPM_MAX,
  BPM_MIN,
  getSizeName,
  getTempoName,
  useMetronomeStore,
} from "@/features/metronome";
import { BeatIndicator } from "@/features/metronome/components/beat-indicator";
import { SOUND_LABELS, SoundSheet } from "@/features/metronome/components/sound-sheet";
import { TapTempoSheet } from "@/features/metronome/components/tap-tempo-sheet";
import { TimeSignatureSheet } from "@/features/metronome/components/time-signature-sheet";
import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

export default function MetronomeScreen() {
  const {
    bpm,
    beatPattern,
    soundPreset,
    isPlaying,
    currentBeat,
    screenAwakeEnabled,
    savedPatterns,
    setBpm,
    setBeatPattern,
    setSoundPreset,
    setIsPlaying,
    setCurrentBeat,
    setScreenAwakeEnabled,
    saveCurrentPattern,
    deleteSavedPattern,
    renameSavedPattern,
  } = useMetronomeStore();

  const colors = useColors();
  const [tapSheetVisible, setTapSheetVisible] = useState(false);
  const [sizeSheetVisible, setSizeSheetVisible] = useState(false);
  const [soundSheetVisible, setSoundSheetVisible] = useState(false);

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
    const stopSub = ExpoPrecisionMetronomeModule.addListener("onStop", ({ reason }) => {
      if (reason === "interruption") setIsPlaying(false);
    });
    return () => {
      beatSub.remove();
      stopSub.remove();
    };
  }, [setCurrentBeat, setIsPlaying]);

  useEffect(() => {
    return () => {
      stop();
      setIsPlaying(false);
    };
  }, [setIsPlaying]);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying) {
      await stop();
      setIsPlaying(false);
    } else {
      await start(bpm);
      await setMetronomePattern(beatPatternRef.current);
      await setMetronomeSound(soundPresetRef.current);
      setIsPlaying(true);
    }
  }, [isPlaying, bpm, setIsPlaying]);

  const handleBpmChange = useCallback(
    async (newBpm: number) => {
      const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(newBpm)));
      setBpm(clamped);
      if (isPlaying) await setMetronomeBpm(clamped);
    },
    [isPlaying, setBpm],
  );

  const handleBeatPatternChange = useCallback(
    (newPattern: BeatAccent[]) => {
      setBeatPattern(newPattern);
      if (isPlaying) void setMetronomePattern(newPattern);
    },
    [isPlaying, setBeatPattern],
  );

  const handleSoundChange = useCallback(
    (preset: SoundPreset) => {
      setSoundPreset(preset);
      if (isPlaying) void setMetronomeSound(preset);
    },
    [isPlaying, setSoundPreset],
  );

  const screenOptions = useMemo(
    () => ({ title: "Метроном", headerBackTitle: "Назад" }),
    [],
  );

  const tempoName = getTempoName(bpm);
  const sizeName = getSizeName(beatPattern, savedPatterns);

  return (
    <>
      <Stack.Screen options={screenOptions} />

      <ScreenScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-8 pt-6"
      >
        <View className="mb-8 items-center">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-fg">
            {tempoName}
          </Text>
          <View className="flex-row items-baseline gap-2">
            <Text className="font-sans-semibold text-[88px] leading-tight text-foreground">
              {bpm}
            </Text>
            <Text className="mb-2 text-lg text-muted-fg">BPM</Text>
          </View>
        </View>

        <View className="mb-2 flex-row flex-wrap items-center justify-between">
          <Pressable
            onPress={() => setSizeSheetVisible(true)}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-sm text-muted-fg">Размер · {sizeName}</Text>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={10}
              tintColor={colors.mutedFg}
            />
          </Pressable>
          <View className="flex-row items-center gap-3">
            <LegendDot color={colors.primary} label="Акцент" />
            <LegendDot color={withAlpha(colors.primary, 0.45)} label="Обычная" />
            <LegendDot
              color={withAlpha(colors.mutedFg, 0.15)}
              border={withAlpha(colors.mutedFg, 0.5)}
              label="Без звука"
            />
          </View>
        </View>

        <View className="mb-6">
          <BeatIndicator
            pattern={beatPattern}
            currentBeat={currentBeat}
            onPatternChange={handleBeatPatternChange}
          />
        </View>

        <View className="mb-4 flex-row items-center gap-2">
          <Pressable
            onPress={() => handleBpmChange(bpm - 10)}
            className="h-11 flex-1 items-center justify-center rounded-full bg-surface active:opacity-70"
          >
            <Text className="font-sans-semibold text-foreground">−10</Text>
          </Pressable>

          <Pressable
            onPress={() => handleBpmChange(bpm - 1)}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-70"
          >
            <Text className="font-sans-semibold text-xl text-foreground">−</Text>
          </Pressable>

          <Pressable
            onPress={handlePlayPause}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary active:opacity-80"
          >
            <SymbolView
              name={
                isPlaying
                  ? { ios: "pause.fill", android: "pause" }
                  : { ios: "play.fill", android: "play_arrow" }
              }
              size={26}
              tintColor="#FFFFFF"
            />
          </Pressable>

          <Pressable
            onPress={() => handleBpmChange(bpm + 1)}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface active:opacity-70"
          >
            <Text className="font-sans-semibold text-xl text-foreground">+</Text>
          </Pressable>

          <Pressable
            onPress={() => handleBpmChange(bpm + 10)}
            className="h-11 flex-1 items-center justify-center rounded-full bg-surface active:opacity-70"
          >
            <Text className="font-sans-semibold text-foreground">+10</Text>
          </Pressable>
        </View>

        <View className="mb-8 items-center">
          <Pressable
            onPress={() => setTapSheetVisible(true)}
            className="rounded-full border border-border px-6 py-2.5 active:opacity-70"
          >
            <Text className="font-sans-semibold text-foreground">Тап темп</Text>
          </Pressable>
        </View>

        <View className="mb-6 overflow-hidden rounded-xl bg-surface px-4">
          <SettingsRow
            type="nav"
            icon={{ ios: "music.note", android: "music_note" }}
            iconBgColor={colors.brandRed}
            label="Размер"
            sublabel={sizeName}
            onPress={() => setSizeSheetVisible(true)}
          />
          <View className="h-px bg-border" />
          <SettingsRow
            type="nav"
            icon={{ ios: "speaker.wave.2.fill", android: "volume_up" }}
            iconBgColor={colors.brandAmber}
            label="Звук"
            sublabel={SOUND_LABELS[soundPreset]}
            onPress={() => setSoundSheetVisible(true)}
          />
          <View className="h-px bg-border" />
          <SettingsRow
            type="toggle"
            icon={{ ios: "sun.max.fill", android: "light_mode" }}
            iconBgColor={colors.brandBrown}
            label="Не выключать экран"
            value={screenAwakeEnabled}
            onChange={setScreenAwakeEnabled}
          />
        </View>
      </ScreenScrollView>

      <TapTempoSheet
        visible={tapSheetVisible}
        onClose={() => setTapSheetVisible(false)}
        onBpmChange={handleBpmChange}
      />

      <SoundSheet
        visible={soundSheetVisible}
        currentPreset={soundPreset}
        onClose={() => setSoundSheetVisible(false)}
        onSelect={handleSoundChange}
      />

      <TimeSignatureSheet
        visible={sizeSheetVisible}
        currentPattern={beatPattern}
        savedPatterns={savedPatterns}
        onClose={() => setSizeSheetVisible(false)}
        onApplyPattern={handleBeatPatternChange}
        onSavePattern={saveCurrentPattern}
        onDeletePattern={deleteSavedPattern}
        onRenamePattern={renameSavedPattern}
      />
    </>
  );
}

function LegendDot({
  color,
  border,
  label,
}: {
  color: string;
  border?: string;
  label: string;
}) {
  const colors = useColors();

  return (
    <View className="flex-row items-center gap-1">
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: color,
          borderWidth: border ? 1 : 0,
          borderColor: border,
        }}
      />
      <Text style={{ fontSize: 11, color: colors.mutedFg }}>{label}</Text>
    </View>
  );
}
