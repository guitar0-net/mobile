// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/** @type {import('jest').Config} */
const config = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  transform: {
    // Metro exports .sql files as strings.
    "\\.sql$": "<rootDir>/jest.transform.sql.js",
  },
  transformIgnorePatterns: [
    // The jest-expo default plus drizzle-orm, whose migration bundle is ESM.
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/(?!vector-icons)|@expo-google-fonts|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|drizzle-orm|standard-navigation)",
  ],
  moduleNameMapper: {
    "^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.js",
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
    // jest-expo's auto-mock returns undefined from randomUUID().
    "^expo-crypto$": "<rootDir>/__mocks__/expo-crypto.js",
    "^@gorhom/bottom-sheet$": "<rootDir>/__mocks__/@gorhom/bottom-sheet.js",
    "^react-native-audio-api$": "<rootDir>/__mocks__/react-native-audio-api.js",
    // The real client resolves native storage while it is being constructed.
    "^posthog-react-native$": "<rootDir>/__mocks__/posthog-react-native.js",
    "^react-native-worklets$":
      "<rootDir>/node_modules/react-native-worklets/src/mock.ts",
    // Must precede the preset's @/ → src/ mapping: assets live in the project root.
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
      // No functions threshold: JSX callbacks and useMemo lambdas distort it.
    },
  },
};

module.exports = config;
