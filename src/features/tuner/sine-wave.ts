// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { AudioContext } from "react-native-audio-api";

export function playTuningFork(frequency: number): () => void {
  const context = new AudioContext();

  const oscillator = context.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;

  // Gain node to control volume and apply fade-in to avoid click
  const gain = context.createGain();
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.015);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();

  return () => {
    const now = context.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.015);
    oscillator.stop(now + 0.015);
    setTimeout(() => void context.close(), 50);
  };
}
