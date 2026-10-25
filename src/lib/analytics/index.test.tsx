// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render } from "@testing-library/react-native";

import { AnalyticsScreenTracker } from ".";
import { posthog } from "./client";

const mockRoute = jest.fn<{ segments: string[]; pathname: string; key?: string }, []>();

jest.mock("expo-router", () => ({
  useSegments: () => mockRoute().segments,
  usePathname: () => mockRoute().pathname,
  useRootNavigationState: () => ({ index: 0, routes: [{ key: mockRoute().key }] }),
}));

const screen = posthog.screen as jest.Mock;
const registerForSession = posthog.registerForSession as jest.Mock;

beforeEach(() => {
  screen.mockClear();
  registerForSession.mockClear();
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

  it("does not report a return to a screen that is still open, but keeps it as the current screen", () => {
    mockRoute.mockReturnValue({
      segments: ["lesson", "[id]"],
      pathname: "/lesson/a",
      key: "lesson-a",
    });
    const { rerender } = render(<AnalyticsScreenTracker />);

    mockRoute.mockReturnValue({
      segments: ["song", "[id]"],
      pathname: "/song/s",
      key: "song-s",
    });
    rerender(<AnalyticsScreenTracker />);

    mockRoute.mockReturnValue({
      segments: ["lesson", "[id]"],
      pathname: "/lesson/a",
      key: "lesson-a",
    });
    rerender(<AnalyticsScreenTracker />);

    expect(screen).toHaveBeenCalledTimes(2);
    expect(screen).toHaveBeenLastCalledWith("/song/[id]", { pathname: "/song/s" });
    expect(registerForSession).toHaveBeenCalledWith({ $screen_name: "/lesson/[id]" });
  });

  it("reports a screen opened again after it was closed", () => {
    mockRoute.mockReturnValue({
      segments: ["song", "[id]"],
      pathname: "/song/s",
      key: "song-1",
    });
    const { rerender } = render(<AnalyticsScreenTracker />);

    mockRoute.mockReturnValue({
      segments: ["lesson", "[id]"],
      pathname: "/lesson/a",
      key: "lesson-a",
    });
    rerender(<AnalyticsScreenTracker />);

    mockRoute.mockReturnValue({
      segments: ["song", "[id]"],
      pathname: "/song/s",
      key: "song-2",
    });
    rerender(<AnalyticsScreenTracker />);

    expect(screen).toHaveBeenCalledTimes(3);
    expect(registerForSession).not.toHaveBeenCalled();
  });

  it("does not report the same screen twice when its route key appears late", () => {
    mockRoute.mockReturnValue({ segments: ["(tabs)", "home"], pathname: "/home" });
    const { rerender } = render(<AnalyticsScreenTracker />);

    mockRoute.mockReturnValue({
      segments: ["(tabs)", "home"],
      pathname: "/home",
      key: "home",
    });
    rerender(<AnalyticsScreenTracker />);

    expect(screen).toHaveBeenCalledTimes(1);
  });
});
