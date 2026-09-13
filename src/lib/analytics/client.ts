// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import PostHog from "posthog-react-native";

const POSTHOG_HOST = "https://eu.i.posthog.com";

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

export const posthog = new PostHog(apiKey || "phc_disabled", {
  host: POSTHOG_HOST,
  disabled: __DEV__ || !apiKey,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: true,
      unhandledRejections: true,
      nativeCrashes: true,
    },
  },
});
