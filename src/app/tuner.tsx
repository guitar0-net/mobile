// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking, Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { SettingsRow } from "@/components/ui/settings-row";
import { Text } from "@/components/ui/text";
import {
  TUNINGS,
  findNearestString,
  noteFrequency,
  useTunerStore,
} from "@/features/tuner";
import { StringSelector } from "@/features/tuner/components/string-selector";
import { TunerNeedle } from "@/features/tuner/components/tuner-needle";
import { TuningSheet } from "@/features/tuner/components/tuning-sheet";
import {
  requestMicPermission,
  startPitchDetection,
} from "@/features/tuner/pitch-detector";
import { playTuningFork } from "@/features/tuner/sine-wave";
import { capture } from "@/lib/analytics";
import { useScreenAwake } from "@/lib/screen-awake";
import { useColors } from "@/lib/themes";

export default function TunerScreen() {
  const {
    tuningId,
    tuningForkEnabled,
    detectedFrequency,
    selectedStringIndex,
    setTuningId,
    setTuningForkEnabled,
    setDetectedFrequency,
    setSelectedStringIndex,
  } = useTunerStore();

  const colors = useColors();
  useScreenAwake(true);
  const [permStatus, setPermStatus] = useState<"checking" | "granted" | "denied">(
    "checking",
  );
  const [tuningSheetVisible, setTuningSheetVisible] = useState(false);
  const stopForkRef = useRef<(() => void) | null>(null);

  const tuning = useMemo(
    () => TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0],
    [tuningId],
  );

  useEffect(() => {
    requestMicPermission().then((granted) => {
      setPermStatus(granted ? "granted" : "denied");
      capture("tuner_mic_permission_resolved", { granted });
    });
  }, []);

  useEffect(() => {
    if (permStatus !== "denied") return;

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        requestMicPermission().then((ok) => {
          if (ok) setPermStatus("granted");
        });
      }
    });

    return () => sub.remove();
  }, [permStatus]);

  // Start/stop pitch detection based on permission
  useEffect(() => {
    if (permStatus !== "granted") return;

    // Hold the last detected frequency for HOLD_MS before clearing.
    // Short null gaps from the detector (normal during playing) are invisible.
    const HOLD_MS = 600;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;

    // Median of 3 consecutive readings to reject single-frame frequency spikes.
    const freqWindow: number[] = [];

    const stop = startPitchDetection((result) => {
      if (result) {
        if (clearTimer) {
          clearTimeout(clearTimer);
          clearTimer = null;
        }
        freqWindow.push(result.frequency);
        if (freqWindow.length > 3) freqWindow.shift();
        const sorted = [...freqWindow].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        setDetectedFrequency(median);
      } else {
        freqWindow.length = 0;
        if (!clearTimer) {
          clearTimer = setTimeout(() => {
            setDetectedFrequency(null);
            clearTimer = null;
          }, HOLD_MS);
        }
      }
    });

    return () => {
      stop();
      if (clearTimer) clearTimeout(clearTimer);
      setDetectedFrequency(null);
    };
  }, [permStatus, setDetectedFrequency]);

  // Tuning fork: play reference tone when a string is manually selected
  useEffect(() => {
    stopForkRef.current?.();
    stopForkRef.current = null;

    if (!tuningForkEnabled || selectedStringIndex === null) return;

    const { note, octave } = tuning.strings[selectedStringIndex];
    const freq = noteFrequency(note, octave);
    stopForkRef.current = playTuningFork(freq);

    return () => {
      stopForkRef.current?.();
      stopForkRef.current = null;
    };
  }, [tuningForkEnabled, selectedStringIndex, tuning]);

  // Compute tuning result from detected frequency
  const tuningResult = useMemo(() => {
    if (detectedFrequency === null) return null;
    return findNearestString(
      detectedFrequency,
      tuning,
      selectedStringIndex ?? undefined,
    );
  }, [detectedFrequency, tuning, selectedStringIndex]);

  const cents = tuningResult?.cents ?? 0;
  const inTune = tuningResult !== null && Math.abs(cents) < 5;
  const isAuto = selectedStringIndex === null;

  const screenOptions = useMemo(
    () => ({ title: "Тюнер", headerBackTitle: "Назад" }),
    [],
  );

  return (
    <>
      <Stack.Screen options={screenOptions} />

      <ScreenScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-4 pb-8 pt-4"
      >
        {/* Top row: Auto toggle + Tuning picker */}
        <View className="mb-6 flex-row items-center justify-between">
          <Pressable
            onPress={() => setSelectedStringIndex(null)}
            className="flex-row items-center gap-1.5 active:opacity-70"
          >
            {isAuto && (
              <SymbolView
                name={{ ios: "checkmark", android: "check" }}
                size={14}
                tintColor={colors.primary}
              />
            )}
            <Text
              className="font-sans-semibold text-sm"
              style={{ color: isAuto ? colors.primary : colors.mutedFg }}
            >
              Авто
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTuningSheetVisible(true)}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-sm text-muted-fg">
              {tuning.label} · {tuning.shortLabel}
            </Text>
            <SymbolView
              name={{ ios: "chevron.right", android: "chevron_right" }}
              size={10}
              tintColor={colors.mutedFg}
            />
          </Pressable>
        </View>

        {/* Note display */}
        <View className="mb-2 items-center">
          {tuningResult ? (
            <>
              <View className="mb-1 flex-row items-center gap-1.5">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: inTune ? colors.success : colors.mutedFg }}
                />
                <Text
                  className="font-sans-semibold text-xs uppercase tracking-widest"
                  style={{ color: inTune ? colors.success : colors.mutedFg }}
                >
                  {inTune ? "Идеально" : "Настройте"}
                </Text>
              </View>
              <Text className="font-sans-semibold text-[96px] leading-none text-foreground">
                {tuningResult.note}
              </Text>
              <Text className="mt-1 text-sm text-muted-fg">
                {detectedFrequency?.toFixed(1)} Гц · {6 - tuningResult.stringIndex}{" "}
                струна
              </Text>
            </>
          ) : (
            <>
              <View className="mb-1 flex-row items-center gap-1.5">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors.mutedFg }}
                />
                <Text className="font-sans-semibold text-xs uppercase tracking-widest text-muted-fg">
                  {permStatus === "denied"
                    ? "Нет доступа к микрофону"
                    : "Играйте струну"}
                </Text>
              </View>
              <Text className="font-sans-semibold text-[96px] leading-none text-muted-fg">
                —
              </Text>
              <Text className="mt-1 text-sm text-muted-fg">— Гц · — струна</Text>
            </>
          )}
        </View>

        {/* Permission denied prompt */}
        {permStatus === "denied" && (
          <View className="mb-4 items-center">
            <Button variant="outline" onPress={() => Linking.openSettings()}>
              Открыть настройки
            </Button>
          </View>
        )}

        {/* Needle */}
        <View className="mb-4">
          <TunerNeedle cents={cents} active={tuningResult !== null} />
        </View>

        {/* String selector */}
        <View className="mb-8">
          <StringSelector
            tuning={tuning}
            selectedIndex={selectedStringIndex}
            detectedIndex={tuningResult?.stringIndex ?? null}
            onSelect={setSelectedStringIndex}
          />
        </View>

        {/* Settings */}
        <View className="overflow-hidden rounded-xl bg-surface px-4">
          <SettingsRow
            type="nav"
            icon={{ ios: "guitars", android: "music_note" }}
            iconBgColor={colors.brandAmber}
            label="Строй"
            sublabel={`${tuning.label} · ${tuning.shortLabel}`}
            onPress={() => setTuningSheetVisible(true)}
          />
          <View className="h-px bg-border" />
          <SettingsRow
            type="toggle"
            icon={{ ios: "tuningfork", android: "volume_up" }}
            iconBgColor={colors.brandRed}
            label="Звук камертона"
            value={tuningForkEnabled}
            onChange={setTuningForkEnabled}
          />
        </View>
      </ScreenScrollView>

      <TuningSheet
        visible={tuningSheetVisible}
        currentTuningId={tuningId}
        onClose={() => setTuningSheetVisible(false)}
        onSelect={(t) => setTuningId(t.id)}
      />
    </>
  );
}
