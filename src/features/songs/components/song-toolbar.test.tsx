// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, fireEvent, render } from "@testing-library/react-native";
import * as expoPrecisionMetronome from "expo-precision-metronome";
import type { PlaybackEventPayload } from "expo-precision-metronome";
import type { ReactNode } from "react";

import { useMetronomeStore } from "@/features/metronome";
import { resetMetronomeForTesting } from "@/features/metronome/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { SongToolbar } from "./song-toolbar";

jest.mock("./song-print-sheet", () => ({
  SongPrintSheet: () => null,
}));

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
    withSequence: (...vals: unknown[]) => vals[vals.length - 1],
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-precision-metronome", () => ({
  __esModule: true,
  default: {
    addListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  setBpm: jest.fn().mockResolvedValue(undefined),
  setPattern: jest.fn().mockResolvedValue(undefined),
  setSound: jest.fn().mockResolvedValue(undefined),
  SOUND_PRESETS: ["click", "beep", "woodblock", "rim", "hihat", "cowbell"], // cSpell:ignore hihat
}));

const metronomeMod = expoPrecisionMetronome as unknown as {
  default: { addListener: jest.Mock };
  start: jest.Mock;
  stop: jest.Mock;
};

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  resetMetronomeForTesting();
  jest.clearAllMocks();
  metronomeMod.default.addListener.mockReturnValue({ remove: jest.fn() });
  metronomeMod.start.mockResolvedValue(undefined);
  metronomeMod.stop.mockResolvedValue(undefined);
});

describe("SongToolbar", () => {
  test("shows BPM from store", () => {
    useMetronomeStore.setState({ bpm: 110 });
    const { getAllByText } = render(
      <SongToolbar
        songBpm={90}
        autoScrollSpeedIndex={0}
        onAutoScrollCycle={jest.fn()}
        songUuid="song-test"
        hasChords={true}
        hasSchemes={true}
      />,
      { wrapper },
    );
    expect(getAllByText("110").length).toBeGreaterThan(0);
    expect(getAllByText("BPM").length).toBeGreaterThan(0);
  });

  test("pressing play starts the metronome and sets isPlaying", async () => {
    const { getAllByRole } = render(
      <SongToolbar
        songBpm={90}
        autoScrollSpeedIndex={0}
        onAutoScrollCycle={jest.fn()}
        songUuid="song-test"
        hasChords={true}
        hasSchemes={true}
      />,
      { wrapper },
    );
    const [playButton] = getAllByRole("button");
    await act(async () => {
      fireEvent.press(playButton);
    });
    expect(metronomeMod.start).toHaveBeenCalledWith(92);
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
  });

  test("pressing play while playing stops the metronome and clears isPlaying", async () => {
    useMetronomeStore.setState({ isPlaying: true });
    const { getAllByRole } = render(
      <SongToolbar
        songBpm={90}
        autoScrollSpeedIndex={0}
        onAutoScrollCycle={jest.fn()}
        songUuid="song-test"
        hasChords={true}
        hasSchemes={true}
      />,
      { wrapper },
    );
    const [playButton] = getAllByRole("button");
    await act(async () => {
      fireEvent.press(playButton);
    });
    expect(metronomeMod.stop).toHaveBeenCalled();
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
  });

  test("follows interruption pause and auto-resume", () => {
    let onPlaybackChange: ((event: PlaybackEventPayload) => void) | null = null;
    metronomeMod.default.addListener.mockImplementation(
      (event: string, callback: (event: PlaybackEventPayload) => void) => {
        if (event === "onPlaybackChange") onPlaybackChange = callback;
        return { remove: jest.fn() };
      },
    );

    useMetronomeStore.setState({ isPlaying: true });
    render(
      <SongToolbar
        songBpm={90}
        autoScrollSpeedIndex={0}
        onAutoScrollCycle={jest.fn()}
        songUuid="song-test"
        hasChords={true}
        hasSchemes={true}
      />,
      { wrapper },
    );

    act(() => {
      onPlaybackChange?.({ state: "paused", reason: "interruption" });
    });
    expect(useMetronomeStore.getState().isPlaying).toBe(false);

    act(() => {
      onPlaybackChange?.({ state: "running", reason: "interruption" });
    });
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
  });

  test("clamps BPM change to BPM_MIN", async () => {
    // handleBpmChange is passed down to the sheet (always rendered)
    // Trigger it via the sheet's −10 button when bpm is near BPM_MIN
    useMetronomeStore.setState({ bpm: 25 });
    const { getByText } = render(
      <SongToolbar
        songBpm={90}
        autoScrollSpeedIndex={0}
        onAutoScrollCycle={jest.fn()}
        songUuid="song-test"
        hasChords={true}
        hasSchemes={true}
      />,
      { wrapper },
    );
    await act(async () => {
      fireEvent.press(getByText("−10"));
    });
    expect(useMetronomeStore.getState().bpm).toBe(20);
  });
});
