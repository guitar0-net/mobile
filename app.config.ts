// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ConfigContext, ExpoConfig } from "expo/config";

// EAS_BUILD_PROFILE is set only on EAS builders, never when EAS CLI evaluates
// this file locally.
if (
  process.env.EAS_BUILD_PROFILE === "production" &&
  !process.env.EXPO_PUBLIC_POSTHOG_KEY
) {
  throw new Error(
    "EXPO_PUBLIC_POSTHOG_KEY is not set in the EAS production environment: the build would ship without analytics and error tracking.",
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Гитара с нуля",
  slug: "Guitar0",
  owner: "kotlyar",
  version: "5.3.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "mobile",
  userInterfaceStyle: "automatic",
  ios: {
    icon: "./assets/guitar0.icon",
    bundleIdentifier: "com.andreykotlyar.guitar0",
    config: {
      usesNonExemptEncryption: false,
    },
  },
  android: {
    package: "com.andreykotlyar.guitar0",
    adaptiveIcon: {
      backgroundColor: "#FFFFFF",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#FFFFFF",
        image: "./assets/images/splash-icon.png",
        imageWidth: 180,
        dark: {
          backgroundColor: "#09090B",
        },
      },
    ],
    "expo-font",
    "expo-iap",
    "expo-image",
    "expo-sqlite",
    "expo-video",
    "expo-sharing",
    "expo-status-bar",
    [
      "react-native-audio-api",
      {
        iosMicrophonePermission:
          "Тюнер использует микрофон для определения высоты звука",
        iosBackgroundMode: false,
        androidPermissions: ["android.permission.RECORD_AUDIO"],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://api.guitar0.net",
    eas: {
      projectId: "914c0e3e-0a72-4499-bd36-d85af91934b8",
    },
  },
});
