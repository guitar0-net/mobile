// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from "react-native";

const SCROLL_SPEEDS = [0, 22, 36, 52] as const; // px/sec, 0 = off
const INTERVAL_MS = 16;
const MOMENTUM_RESUME_DELAY_MS = 100;

export function useAutoScroll(scrollRef: React.RefObject<ScrollView | null>) {
  const [speedIndex, setSpeedIndex] = useState(0);
  const scrollYRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const isUserScrollingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    contentHeightRef.current = e.nativeEvent.contentSize.height;
    layoutHeightRef.current = e.nativeEvent.layoutMeasurement.height;
  }, []);

  const onScrollBeginDrag = useCallback(() => {
    clearTimeout(resumeTimerRef.current);
    isUserScrollingRef.current = true;
  }, []);

  const onScrollEndDrag = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = e.nativeEvent.contentOffset.y;
    resumeTimerRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, MOMENTUM_RESUME_DELAY_MS);
  }, []);

  const onMomentumScrollBegin = useCallback(() => {
    clearTimeout(resumeTimerRef.current);
  }, []);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollYRef.current = e.nativeEvent.contentOffset.y;
      isUserScrollingRef.current = false;
    },
    [],
  );

  const cycleSpeed = useCallback(() => {
    setSpeedIndex((prev) => (prev + 1) % SCROLL_SPEEDS.length);
  }, []);

  useEffect(() => {
    return () => clearTimeout(resumeTimerRef.current);
  }, []);

  useEffect(() => {
    const pxPerSec = SCROLL_SPEEDS[speedIndex];
    if (pxPerSec === 0) return;

    const pxPerInterval = (pxPerSec * INTERVAL_MS) / 1000;
    const id = setInterval(() => {
      if (isUserScrollingRef.current) return;
      const nextY = scrollYRef.current + pxPerInterval;
      const atBottom =
        contentHeightRef.current > 0 &&
        nextY + layoutHeightRef.current >= contentHeightRef.current;
      if (atBottom) return;
      scrollYRef.current = nextY;
      scrollRef.current?.scrollTo({ y: nextY, animated: false });
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [speedIndex, scrollRef]);

  return {
    speedIndex,
    cycleSpeed,
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollBegin,
    onMomentumScrollEnd,
  };
}
