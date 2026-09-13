// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { usePathname, useSegments } from "expo-router";
import { useEffect } from "react";

import { posthog } from "./client";
import type { AnalyticsEvents } from "./events";

export type { AnalyticsEvents } from "./events";

export type ExceptionProperties = Record<string, string | number | boolean | null>;

export function capture<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  void posthog.capture(event, properties);
}

export function captureException(
  error: unknown,
  properties?: ExceptionProperties,
): void {
  posthog.captureException(error, properties);
}

export function AnalyticsScreenTracker() {
  const screen = `/${useSegments().join("/")}`;
  const pathname = usePathname();

  useEffect(() => {
    void posthog.screen(screen, { pathname });
  }, [screen, pathname]);

  return null;
}
