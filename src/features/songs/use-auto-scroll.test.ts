// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, renderHook } from "@testing-library/react-native";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

import { useAutoScroll } from "./use-auto-scroll";

function makeScrollRef() {
  return { current: { scrollTo: jest.fn() } as unknown as ScrollView };
}

function makeScrollEvent(
  y: number,
  contentHeight = 0,
  layoutHeight = 0,
): NativeSyntheticEvent<NativeScrollEvent> {
  return {
    nativeEvent: {
      contentOffset: { y },
      contentSize: { height: contentHeight },
      layoutMeasurement: { height: layoutHeight },
    },
  } as NativeSyntheticEvent<NativeScrollEvent>;
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useAutoScroll", () => {
  test("starts at speed index 0 (off)", () => {
    const { result } = renderHook(() => useAutoScroll(makeScrollRef()));
    expect(result.current.speedIndex).toBe(0);
  });

  test("cycleSpeed advances 0→1→2→3→0", () => {
    const { result } = renderHook(() => useAutoScroll(makeScrollRef()));

    act(() => result.current.cycleSpeed());
    expect(result.current.speedIndex).toBe(1);

    act(() => result.current.cycleSpeed());
    expect(result.current.speedIndex).toBe(2);

    act(() => result.current.cycleSpeed());
    expect(result.current.speedIndex).toBe(3);

    act(() => result.current.cycleSpeed());
    expect(result.current.speedIndex).toBe(0);
  });

  test("does not call scrollTo when speed index is 0", () => {
    const scrollRef = makeScrollRef();
    renderHook(() => useAutoScroll(scrollRef));

    act(() => jest.advanceTimersByTime(100));
    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });

  test("calls scrollTo on every 16ms tick when speed > 0", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed()); // index 1
    act(() => jest.advanceTimersByTime(48)); // 3 ticks

    expect(scrollRef.current.scrollTo).toHaveBeenCalledTimes(3);
    expect(scrollRef.current.scrollTo).toHaveBeenCalledWith({
      y: expect.any(Number),
      animated: false,
    });
  });

  test("scrolls from position updated by onScroll", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.onScroll(makeScrollEvent(500)));

    act(() => result.current.cycleSpeed()); // index 1 = 22 px/sec
    act(() => jest.advanceTimersByTime(16)); // 1 tick

    const call = (scrollRef.current.scrollTo as jest.Mock).mock.calls[0][0] as {
      y: number;
    };
    expect(call.y).toBeCloseTo(500.352, 1); // 500 + 22 * 16 / 1000
  });

  test("pauses scrollTo while user is dragging", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed()); // on
    act(() => result.current.onScrollBeginDrag());
    act(() => jest.advanceTimersByTime(100));

    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });

  test("resumes scrolling from drag-end position after fallback delay (no fling)", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed()); // on
    act(() => result.current.onScrollBeginDrag());
    act(() => jest.advanceTimersByTime(50)); // paused — no calls

    act(() => result.current.onScrollEndDrag(makeScrollEvent(300)));
    act(() => jest.advanceTimersByTime(99)); // still paused (< 100ms fallback)
    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1)); // fallback fires at 100ms
    act(() => jest.advanceTimersByTime(16)); // 1 tick after resume

    const call = (scrollRef.current.scrollTo as jest.Mock).mock.calls[0][0] as {
      y: number;
    };
    expect(call.y).toBeGreaterThan(300); // resumed from 300
  });

  test("stays paused during momentum scroll after fling", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed()); // on
    act(() => result.current.onScrollBeginDrag());
    act(() => result.current.onScrollEndDrag(makeScrollEvent(200)));
    act(() => result.current.onMomentumScrollBegin()); // cancels fallback timer
    act(() => jest.advanceTimersByTime(300)); // stays paused during momentum

    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });

  test("resumes from momentum end position after fling", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed()); // on
    act(() => result.current.onScrollBeginDrag());
    act(() => result.current.onScrollEndDrag(makeScrollEvent(200)));
    act(() => result.current.onMomentumScrollBegin());
    act(() => jest.advanceTimersByTime(300)); // paused during momentum

    act(() => result.current.onMomentumScrollEnd(makeScrollEvent(450)));
    act(() => jest.advanceTimersByTime(16)); // 1 tick after resume

    const call = (scrollRef.current.scrollTo as jest.Mock).mock.calls[0][0] as {
      y: number;
    };
    expect(call.y).toBeGreaterThan(450);
  });

  test("pauses ticking at bottom without turning off", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    // content 1000px tall, viewport 600px — bottom at y=400
    act(() => result.current.onScroll(makeScrollEvent(390, 1000, 600)));
    act(() => result.current.cycleSpeed()); // on

    act(() => jest.advanceTimersByTime(160)); // 10 ticks, will cross bottom
    expect(result.current.speedIndex).toBe(1); // still on
    const lastY = (scrollRef.current.scrollTo as jest.Mock).mock.calls.at(-1)?.[0]
      .y as number;
    expect(lastY).toBeLessThan(400); // never went past bottom
  });

  test("resumes from new position after user scrolls back up from bottom", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.onScroll(makeScrollEvent(395, 1000, 600)));
    act(() => result.current.cycleSpeed()); // on
    act(() => jest.advanceTimersByTime(160)); // reaches bottom, pauses

    (scrollRef.current.scrollTo as jest.Mock).mockClear();

    // user scrolls back up
    act(() => result.current.onScrollBeginDrag());
    act(() => result.current.onScrollEndDrag(makeScrollEvent(200, 1000, 600)));
    act(() => jest.advanceTimersByTime(100)); // fallback timer fires
    act(() => jest.advanceTimersByTime(16)); // 1 tick

    expect(scrollRef.current.scrollTo).toHaveBeenCalled();
    const call = (scrollRef.current.scrollTo as jest.Mock).mock.calls[0][0] as {
      y: number;
    };
    expect(call.y).toBeGreaterThan(200);
  });

  test("stops scrolling when cycled back to index 0", () => {
    const scrollRef = makeScrollRef();
    const { result } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed()); // on
    act(() => jest.advanceTimersByTime(16));
    expect(scrollRef.current.scrollTo).toHaveBeenCalledTimes(1);

    act(() => result.current.cycleSpeed());
    act(() => result.current.cycleSpeed());
    act(() => result.current.cycleSpeed()); // back to 0

    (scrollRef.current.scrollTo as jest.Mock).mockClear();
    act(() => jest.advanceTimersByTime(100));
    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });

  test("clears interval on unmount", () => {
    const scrollRef = makeScrollRef();
    const { result, unmount } = renderHook(() => useAutoScroll(scrollRef));

    act(() => result.current.cycleSpeed());
    unmount();

    act(() => jest.advanceTimersByTime(100));
    expect(scrollRef.current.scrollTo).not.toHaveBeenCalled();
  });
});
