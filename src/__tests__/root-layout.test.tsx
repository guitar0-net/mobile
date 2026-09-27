// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { renderRouter, screen } from "expo-router/testing-library";
import { Text } from "react-native";

import { capture } from "@/lib/analytics";

import RootLayout from "../app/_layout";

jest.mock("@/global.css", () => ({}));

jest.mock("expo-font", () => ({ useFonts: () => [true, null] }));

jest.mock("@/lib/sync", () => ({
  usePrepareApp: () => ({ status: "ready", snapshotApplied: false, retry: jest.fn() }),
}));

jest.mock("@/lib/analytics", () => ({
  capture: jest.fn(),
  AnalyticsScreenTracker: () => null,
}));

jest.mock("@/features/activity", () => ({ ActivitySessionTracker: () => null }));

jest.mock("@/features/donations", () => ({
  DonationIapProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function renderApp() {
  return renderRouter({
    _layout: RootLayout,
    index: () => <Text>home</Text>,
  });
}

function appReadyEvents() {
  return jest.mocked(capture).mock.calls.filter(([event]) => event === "app_ready");
}

test("reports app_ready once per JS context, not on every RootLayout remount", async () => {
  const first = renderApp();
  await screen.findByText("home");
  first.unmount();

  renderApp();
  await screen.findByText("home");

  expect(appReadyEvents()).toHaveLength(1);
});
