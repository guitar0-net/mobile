// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// Suppress the "not wrapped in act()" warning for async Zustand store updates.
//
// Zustand calls React's scheduleUpdateOnFiber directly when store state changes,
// which React Test Renderer flags as outside act(). This happens when an async
// hook (e.g. useAppSync) resolves mock promises and updates store state in
// microtasks that complete before waitFor starts polling. Tests still assert on
// the correct final state via waitFor — the warning is a false positive.
const originalConsoleError = console.error;
console.error = (...args) => {
  if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) return;
  originalConsoleError(...args);
};

const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === "string" && args[0].startsWith("[sync] failed:")) return;
  originalConsoleWarn(...args);
};

// AsyncStorage is only read by the pre-5.0 progress import; the package ships
// an in-memory mock so tests never touch native storage.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// useSafeAreaInsets() throws when no <SafeAreaProvider> is rendered above it.
// Falling back to zero insets keeps component tests from having to wrap every
// subject in a provider just because it uses a sheet or a screen scroll view.
jest.mock("react-native-safe-area-context", () => {
  const { useContext } = require("react");
  const actual = jest.requireActual("react-native-safe-area-context");
  return {
    ...actual,
    useSafeAreaInsets: () =>
      useContext(actual.SafeAreaInsetsContext) ?? {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
  };
});
