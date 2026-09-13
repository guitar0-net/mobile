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
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { ActivitySessionTracker } from "@/features/activity";
import { DonationIapProvider } from "@/features/donations";
import { AnalyticsScreenTracker } from "@/lib/analytics";
import { queryClient } from "@/lib/network/query-client";
import { ThemeProvider, useTheme, useThemedScreenOptions } from "@/lib/themes";

SplashScreen.preventAutoHideAsync();

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
        <Stack.Screen name="loading" options={{ headerShown: false }} />
        <Stack.Screen name="migration" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lesson/[id]" options={{ headerBackTitle: "Назад" }} />
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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
