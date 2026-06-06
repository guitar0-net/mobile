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
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/(?!vector-icons)|@expo-google-fonts|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|drizzle-orm)",
  ],
  moduleNameMapper: {
    // Replace react-native-mmkv with a pure in-memory mock so tests never
    // touch native Nitro/TurboModule code.
    "^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.js",
    // Replace expo-sqlite with a better-sqlite3-backed in-memory mock so
    // tests never touch native TurboModule code.
    "^expo-sqlite$": "<rootDir>/__mocks__/expo-sqlite.js",
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
    "!src/lib/dev/**",
    "!src/features/lessons/schema.ts",
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
