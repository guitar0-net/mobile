// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import "@/global.css";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavThemeProvider,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { ActivitySessionTracker } from "@/features/activity";
import { DonationIapProvider } from "@/features/donations";
import { AnalyticsScreenTracker, capture } from "@/lib/analytics";
import { queryClient } from "@/lib/network/query-client";
import { usePrepareApp } from "@/lib/sync";
import { ThemeProvider, useTheme, useThemedScreenOptions } from "@/lib/themes";

SplashScreen.preventAutoHideAsync();

const jsStartedAt = Date.now();
let isReadyReported = false;

// Android: a stack screen hidden under the video keeps a stale Fabric layout after rotation,
// so its Pressables drop presses. transparentModal keeps it attached and laid out.
const videoScreenOptions = {
  presentation: Platform.OS === "android" ? "transparentModal" : "card",
} as const;

function StatusBarAdapter() {
  const { theme } = useTheme();
  const isDark = theme === "dark" || theme === "contrast-dark";
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function ThemedStack() {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark" || theme === "contrast-dark";
  const screenOptions = useThemedScreenOptions();

  const navTheme = isDark
    ? {
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.foreground,
          border: colors.border,
          primary: colors.primary,
        },
      }
    : {
        ...DefaultTheme,
        colors: {
          ...DefaultTheme.colors,
          background: colors.background,
          card: colors.surface,
          text: colors.foreground,
          border: colors.border,
          primary: colors.primary,
        },
      };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="migration" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ headerBackTitle: "Назад" }} />
        <Stack.Screen name="video/[id]" options={videoScreenOptions} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Geist-Regular": require("../../assets/fonts/Geist-Regular.ttf"),
    "Geist-SemiBold": require("../../assets/fonts/Geist-SemiBold.ttf"),
    Debby: require("../../assets/fonts/Debby.ttf"),
  });
  const { status, snapshotApplied, retry } = usePrepareApp();
  const isSettled = (fontsLoaded || fontError != null) && status !== "preparing";

  useEffect(() => {
    if (!isSettled) return;
    void SplashScreen.hideAsync();
    if (status !== "ready" || isReadyReported) return;
    isReadyReported = true;
    capture("app_ready", {
      duration_ms: Date.now() - jsStartedAt,
      snapshot_applied: snapshotApplied,
    });
  }, [isSettled, status, snapshotApplied]);

  if (!isSettled) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        {status === "ready" ? <PreparedApp /> : <DbInitError onRetry={retry} />}
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function PreparedApp() {
  return (
    <>
      <ActivitySessionTracker />
      <AnalyticsScreenTracker />
      <DonationIapProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <ThemedStack />
            <StatusBarAdapter />
          </BottomSheetModalProvider>
        </ThemeProvider>
      </DonationIapProvider>
    </>
  );
}

function DbInitError({ onRetry }: { onRetry: () => void }) {
  return (
    <ThemeProvider>
      <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
        <StatusMessage variant="error">Не удалось открыть базу данных</StatusMessage>
        <Button variant="ghost" size="sm" onPress={onRetry}>
          Повторить
        </Button>
      </View>
    </ThemeProvider>
  );
}
