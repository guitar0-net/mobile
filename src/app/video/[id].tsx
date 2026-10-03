// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useQuery } from "@tanstack/react-query";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { SymbolView } from "expo-symbols";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { fetchLessonVideoPath, videoStreamUrl } from "@/features/lessons";
import { capture } from "@/lib/analytics";
import { useColors } from "@/lib/themes";
import { cn } from "@/lib/utils";

export default function VideoScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { id, source } = useLocalSearchParams<{ id: string; source: string }>();
  const colors = useColors();
  const [hasError, setHasError] = useState(false);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

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
      capture("video_screen_closed", { lesson_id: id, landscape, had_error: hasError });
    });
  }, [navigation, player, id, landscape, hasError]);

  useEffect(() => {
    void ScreenOrientation.unlockAsync();
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  useEffect(() => {
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "error") setHasError(true);
    });
    return () => sub.remove();
  }, [player]);

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
          onFullscreenEnter={() =>
            capture("video_fullscreen_entered", { lesson_id: id })
          }
          onFullscreenExit={() => capture("video_fullscreen_exited", { lesson_id: id })}
        />
        {hasError && (
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
              Не удалось загрузить видео
            </Text>
            <Pressable onPress={() => router.back()}>
              {({ pressed }) => (
                <View
                  className={cn(
                    "rounded-full border border-white/40 px-6 py-3",
                    pressed && "opacity-70",
                  )}
                >
                  <Text variant="body" className="text-white">
                    Назад
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
