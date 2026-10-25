// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { usePathname, useRootNavigationState, useSegments } from "expo-router";
import { useEffect, useRef } from "react";

import { posthog } from "./client";
import type { AnalyticsEvents } from "./events";

export type { AnalyticsEvents } from "./events";

type ExceptionProperties = Record<string, string | number | boolean | null>;

export function capture<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): void {
  posthog.capture(event, properties);
}

export function captureException(
  error: unknown,
  properties?: ExceptionProperties,
): void {
  posthog.captureException(error, properties);
}

type NavigationState = {
  index?: number;
  routes: readonly { key?: string; state?: NavigationState }[];
};

function focusedRouteKey(state: NavigationState | undefined): string | undefined {
  const route = state?.routes[state.index ?? 0];
  return route?.state ? focusedRouteKey(route.state) : route?.key;
}

export function AnalyticsScreenTracker() {
  const screen = `/${useSegments().join("/")}`;
  const pathname = usePathname();
  const routeKey = focusedRouteKey(useRootNavigationState());
  const visitedRouteKeys = useRef(new Set<string>());
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    const isReturn = routeKey !== undefined && visitedRouteKeys.current.has(routeKey);
    if (routeKey) visitedRouteKeys.current.add(routeKey);
    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;

    if (isReturn) {
      posthog.registerForSession({ $screen_name: screen });
    } else {
      void posthog.screen(screen, { pathname });
    }
  }, [screen, pathname, routeKey]);

  return null;
}
