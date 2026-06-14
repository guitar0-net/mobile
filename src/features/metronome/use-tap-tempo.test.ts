// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";

import { BPM_MAX, BPM_MIN } from "./store";
import { useTapTempo } from "./use-tap-tempo";

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useTapTempo", () => {
  test("initial state: tapCount=0, tapBpm=null", () => {
    const { result } = renderHook(() => useTapTempo(jest.fn()));
    expect(result.current.tapCount).toBe(0);
    expect(result.current.tapBpm).toBeNull();
  });

  test("single tap increments count but does not produce BPM", () => {
    const onBpmChange = jest.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    jest.setSystemTime(0);
    act(() => result.current.tap());

    expect(result.current.tapCount).toBe(1);
    expect(result.current.tapBpm).toBeNull();
    expect(onBpmChange).not.toHaveBeenCalled();
  });

  test("two taps 500ms apart produce 120 BPM", () => {
    const onBpmChange = jest.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    jest.setSystemTime(0);
    act(() => result.current.tap());
    jest.setSystemTime(500);
    act(() => result.current.tap());

    expect(result.current.tapBpm).toBe(120);
    expect(onBpmChange).toHaveBeenCalledWith(120);
  });

  test("three taps calculate average over total elapsed time", () => {
    const onBpmChange = jest.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    // 0ms, 600ms, 1200ms → elapsed=1200ms, 2 intervals → 100 BPM
    jest.setSystemTime(0);
    act(() => result.current.tap());
    jest.setSystemTime(600);
    act(() => result.current.tap());
    jest.setSystemTime(1200);
    act(() => result.current.tap());

    expect(result.current.tapBpm).toBe(100);
    expect(onBpmChange).toHaveBeenLastCalledWith(100);
  });

  test("BPM is clamped to BPM_MIN for very slow taps", () => {
    const onBpmChange = jest.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    // 10 seconds apart → 6 BPM → clamped to BPM_MIN
    jest.setSystemTime(0);
    act(() => result.current.tap());
    jest.setSystemTime(10_000);
    act(() => result.current.tap());

    expect(result.current.tapBpm).toBe(BPM_MIN);
    expect(onBpmChange).toHaveBeenCalledWith(BPM_MIN);
  });

  test("BPM is clamped to BPM_MAX for very fast taps", () => {
    const onBpmChange = jest.fn();
    const { result } = renderHook(() => useTapTempo(onBpmChange));

    // 10ms apart → 6000 BPM → clamped to BPM_MAX
    jest.setSystemTime(0);
    act(() => result.current.tap());
    jest.setSystemTime(10);
    act(() => result.current.tap());

    expect(result.current.tapBpm).toBe(BPM_MAX);
    expect(onBpmChange).toHaveBeenCalledWith(BPM_MAX);
  });

  test("reset clears tapCount and tapBpm", () => {
    const { result } = renderHook(() => useTapTempo(jest.fn()));

    jest.setSystemTime(0);
    act(() => result.current.tap());
    jest.setSystemTime(500);
    act(() => result.current.tap());

    act(() => result.current.reset());

    expect(result.current.tapCount).toBe(0);
    expect(result.current.tapBpm).toBeNull();
  });

  test("auto-resets after 3500ms of inactivity", () => {
    const { result } = renderHook(() => useTapTempo(jest.fn()));

    jest.setSystemTime(0);
    act(() => result.current.tap());
    jest.setSystemTime(500);
    act(() => result.current.tap());

    expect(result.current.tapCount).toBe(2);

    act(() => jest.advanceTimersByTime(3500));

    expect(result.current.tapCount).toBe(0);
    expect(result.current.tapBpm).toBeNull();
  });

  test("each tap resets the inactivity timer", () => {
    const { result } = renderHook(() => useTapTempo(jest.fn()));

    jest.setSystemTime(0);
    act(() => result.current.tap());
    act(() => jest.advanceTimersByTime(3000));
    jest.setSystemTime(3000);
    act(() => result.current.tap());

    // Timer reset by second tap — should not have auto-reset yet
    expect(result.current.tapCount).toBe(2);

    act(() => jest.advanceTimersByTime(3500));

    expect(result.current.tapCount).toBe(0);
  });
});
