// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/** @type {import('jest').Config} */
const config = {
  preset: "jest-expo",
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  moduleNameMapper: {
    // Replace react-native-mmkv with a pure in-memory mock so tests never
    // touch native Nitro/TurboModule code.
    "^react-native-mmkv$": "<rootDir>/__mocks__/react-native-mmkv.js",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/app/**",
    "!src/components/app-tabs.tsx",
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      functions: 80,
      branches: 80,
      lines: 80,
    },
  },
};

module.exports = config;
