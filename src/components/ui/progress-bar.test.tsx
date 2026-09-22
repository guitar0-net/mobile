// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";

import { ProgressBar } from "./progress-bar";

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: { View },
    Easing: { inOut: () => undefined, ease: undefined },
    cancelAnimation: jest.fn(),
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});

describe("ProgressBar", () => {
  test("announces the completed percentage", () => {
    render(<ProgressBar value={0.42} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
    expect(bar.props.accessibilityState).toEqual({ busy: false });
  });

  test("clamps values outside 0–1", () => {
    render(<ProgressBar value={1.7} />);
    expect(screen.getByRole("progressbar").props.accessibilityValue.now).toBe(100);
  });

  test("reports itself busy with no percentage when the value is unknown", () => {
    render(<ProgressBar />);
    const bar = screen.getByRole("progressbar");
    expect(bar.props.accessibilityValue).toBeUndefined();
    expect(bar.props.accessibilityState).toEqual({ busy: true });
  });
});
