// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { PitchDetector } from "pitchy";
import { AudioManager, AudioRecorder } from "react-native-audio-api";

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096; // ~93ms per callback at 44100 Hz
const CLARITY_THRESHOLD = 0.75;

export type PitchResult = {
  frequency: number;
  clarity: number;
};

export async function requestMicPermission(): Promise<boolean> {
  const status = await AudioManager.requestRecordingPermissions();
  return status === "Granted";
}

export function startPitchDetection(
  onPitch: (result: PitchResult | null) => void,
): () => void {
  const detector = PitchDetector.forFloat32Array(BUFFER_SIZE);
  const recorder = new AudioRecorder();

  recorder.onAudioReady(
    { sampleRate: SAMPLE_RATE, bufferLength: BUFFER_SIZE, channelCount: 1 },
    ({ buffer }) => {
      const samples = buffer.getChannelData(0);
      if (samples.length !== BUFFER_SIZE) return;
      const [frequency, clarity] = detector.findPitch(samples, SAMPLE_RATE);
      onPitch(clarity >= CLARITY_THRESHOLD ? { frequency, clarity } : null);
    },
  );

  const started = recorder.start();

  return () => {
    recorder.clearOnAudioReady();
    void started.then(
      () => recorder.stop(),
      () => {},
    );
  };
}
