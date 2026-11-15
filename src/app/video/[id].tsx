// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { SymbolView } from "expo-symbols";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { fetchLessonVideoPath, videoStreamUrl } from "@/features/lessons";
import { useVideoErrorReport } from "@/features/reports";
import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function VideoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, source } = useLocalSearchParams<{ id: string; source: string }>();
  const colors = useColors();
  const [playerError, setPlayerError] = useState<string | null>(null);
  const report = useVideoErrorReport(id, source === "offline" ? "offline" : "stream");

  const { data: localVideoPath } = useQuery({
    queryKey: ["lesson-video-path", id],
    queryFn: () => fetchLessonVideoPath(id),
    enabled: source === "offline",
  });

  const videoUri = source === "offline" ? (localVideoPath ?? null) : videoStreamUrl(id);

  const player = useVideoPlayer(videoUri);

  useEffect(() => {
    if (videoUri) player.play();
  }, [videoUri, player]);

  useEffect(() => {
    // beforeRemove fires before the screen is actually torn down — including for the
    // iOS swipe-back gesture — so the player is reliably paused before navigating away.
    return navigation.addListener("beforeRemove", () => {
      player.pause();
    });
  }, [navigation, player]);

  useEffect(() => {
    void ScreenOrientation.unlockAsync();
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status, error }) => {
      if (status === "error") setPlayerError(error?.message ?? "unknown");
    });
    return () => sub.remove();
  }, [player]);

  let errorText = "Не удалось загрузить видео";
  if (report.isOffline) errorText = "Нет подключения к интернету";
  else if (source === "offline") errorText = "Не удалось открыть скачанное видео";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        style={[StyleSheet.absoluteFill, { backgroundColor: "#000" }]}
      >
        <VideoView
          player={player}
          style={{ flex: 1 }}
          nativeControls
          contentFit="contain"
        />
        {playerError !== null && (
          <View
            style={StyleSheet.absoluteFill}
            className="items-center justify-center gap-4 bg-black/80"
          >
            <SymbolView
              name={{ ios: "exclamationmark.triangle.fill", android: "warning" }}
              size={48}
              tintColor={colors.warning}
            />
            <Text variant="body" className="px-8 text-center text-white">
              {errorText}
            </Text>
            {report.canReport && report.sent && (
              <Text variant="body" className="py-3 text-white">
                Спасибо, отправлено ✓
              </Text>
            )}
            {report.canReport && !report.sent && (
              <OverlayButton onPress={() => report.send(playerError)}>
                Сообщить о проблеме
              </OverlayButton>
            )}
            <OverlayButton onPress={() => router.back()}>Назад</OverlayButton>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}

function OverlayButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: string;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        // Same Android crash as in Button (rn-screens#4677).
        <View
          collapsable={false}
          className={cn(
            "rounded-full border border-white/40 px-6 py-3",
            pressed && "opacity-70",
          )}
        >
          <Text variant="body" className="text-white">
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
