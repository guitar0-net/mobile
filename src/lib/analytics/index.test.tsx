// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render } from "@testing-library/react-native";

import { AnalyticsScreenTracker } from ".";
import { posthog } from "./client";

const mockRoute = jest.fn<{ segments: string[]; pathname: string }, []>();

jest.mock("expo-router", () => ({
  useSegments: () => mockRoute().segments,
  usePathname: () => mockRoute().pathname,
}));

const screen = posthog.screen as jest.Mock;

beforeEach(() => {
  screen.mockClear();
});

describe("AnalyticsScreenTracker", () => {
  it("reports the file route, not the resolved path, so lessons share one screen", () => {
    mockRoute.mockReturnValue({
      segments: ["lesson", "[id]"],
      pathname: "/lesson/6f1b-uuid",
    });

    render(<AnalyticsScreenTracker />);

    expect(screen).toHaveBeenCalledWith("/lesson/[id]", {
      pathname: "/lesson/6f1b-uuid",
    });
  });

  it("reports the root route as /", () => {
    mockRoute.mockReturnValue({ segments: [], pathname: "/" });

    render(<AnalyticsScreenTracker />);

    expect(screen).toHaveBeenCalledWith("/", { pathname: "/" });
  });

  it("reports a screen again only when the route changes", () => {
    mockRoute.mockReturnValue({
      segments: ["(tabs)", "home"],
      pathname: "/home",
    });

    const { rerender } = render(<AnalyticsScreenTracker />);
    rerender(<AnalyticsScreenTracker />);
    expect(screen).toHaveBeenCalledTimes(1);

    mockRoute.mockReturnValue({ segments: ["metronome"], pathname: "/metronome" });
    rerender(<AnalyticsScreenTracker />);

    expect(screen).toHaveBeenCalledTimes(2);
    expect(screen).toHaveBeenLastCalledWith("/metronome", { pathname: "/metronome" });
  });
});
