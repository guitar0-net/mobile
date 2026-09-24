// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/** @type {import('jest').Config} */
const config = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  transform: {
    // Transform .sql files as string exports (same as Metro does in production)
    "\\.sql$": "<rootDir>/jest.transform.sql.js",
  },
  transformIgnorePatterns: [
    // jest-expo sets a broad transformIgnorePatterns; override it to also
    // transform drizzle's ESM migration bundle (drizzle/migrations.js).
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/(?!vector-icons)|@expo-google-fonts|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|drizzle-orm|standard-navigation)",
  ],
  moduleNameMapper: {
    // Replace react-native-mmkv with a pure in-memory mock so tests never
    // touch native Nitro/TurboModule code.
    "^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.js",
    // Replace expo-sqlite with a better-sqlite3-backed in-memory mock so
    // tests never touch native TurboModule code.
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
    // Replace expo-crypto with a Node crypto-backed mock — jest-expo's
    // generic native-module auto-mock returns undefined from randomUUID().
    "^expo-crypto$": "<rootDir>/__mocks__/expo-crypto.js",
    // Replace @gorhom/bottom-sheet with a pure JS mock — the real package
    // requires native Worklets/Reanimated initialization unavailable in Jest.
    "^@gorhom/bottom-sheet$": "<rootDir>/__mocks__/@gorhom/bottom-sheet.js",
    // Replace react-native-audio-api with a pure JS mock — the real package
    // requires native TurboModule code unavailable in Jest.
    "^react-native-audio-api$": "<rootDir>/__mocks__/react-native-audio-api.js",
    // Replace posthog-react-native with a stub client — the real one resolves
    // native storage and the crash plugin while it is being constructed.
    "^posthog-react-native$": "<rootDir>/__mocks__/posthog-react-native.js",
    // The jest-expo preset maps @/ → src/, but static assets live in the
    // project root. This more-specific entry takes precedence over the preset.
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/app/**",
    "!src/components/app-tabs.tsx",
    "!src/components/ui/skeleton.tsx",
    "!src/lib/dev/**",
    "!src/lib/analytics/client.ts",
    "!src/lib/analytics/events.ts",
    "!src/features/lessons/schema.ts",
    // Only loads the bundled asset through native expo-asset and expo-file-system.
    "!src/features/lessons/snapshot.ts",
    // Thin pass-through wrapper — its only job is calling useAppSession(),
    // which is already covered behaviorally by use-app-session.test.tsx.
    "!src/features/activity/components/session-tracker.tsx",
    "!src/features/lessons/components/download-button.tsx",
    "!src/features/metronome/components/beat-indicator.tsx",
    "!src/features/metronome/components/pattern-dots.tsx",
    "!src/features/metronome/components/time-signature-sheet.tsx",
    "!src/features/metronome/components/sound-sheet.tsx",
    "!src/features/metronome/components/legend-dot.tsx",
    // Tuner files that wrap native modules or produce audio — no behavioral logic to test
    "!src/features/tuner/pitch-detector.ts",
    "!src/features/tuner/sine-wave.ts",
    "!src/features/tuner/components/tuner-needle.tsx",
    "!src/features/tuner/components/string-selector.tsx",
    "!src/features/tuner/components/tuning-sheet.tsx",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      lines: 80,
      // functions threshold intentionally omitted: JSX prop callbacks, useMemo
      // lambdas, and pass-through wrappers distort this metric and create
      // pressure to write smoke tests with no behavioral assertions.
    },
  },
};

module.exports = config;
