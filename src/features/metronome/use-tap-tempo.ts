// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useCallback, useEffect, useRef, useState } from "react";

import { BPM_MAX, BPM_MIN } from "./store";

const TAP_RESET_MS = 3500;

export function useTapTempo(onBpmChange: (bpm: number) => void) {
  const tapsRef = useRef<number[]>([]);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tapCount, setTapCount] = useState(0);
  const [tapBpm, setTapBpm] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const tap = useCallback(() => {
    const now = Date.now();

    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      tapsRef.current = [];
      setTapCount(0);
      setTapBpm(null);
    }, TAP_RESET_MS);

    tapsRef.current.push(now);
    const taps = tapsRef.current;
    setTapCount(taps.length);

    if (taps.length >= 2) {
      const elapsed = taps[taps.length - 1] - taps[0];
      const bpm = Math.round(((taps.length - 1) * 60000) / elapsed);
      const clamped = Math.max(BPM_MIN, Math.min(BPM_MAX, bpm));
      setTapBpm(clamped);
      onBpmChange(clamped);
    }
  }, [onBpmChange]);

  const reset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    tapsRef.current = [];
    setTapCount(0);
    setTapBpm(null);
  }, []);

  return { tap, reset, tapCount, tapBpm };
}
