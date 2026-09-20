// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render } from "@testing-library/react-native";
import type { BeatAccent } from "expo-precision-metronome";
import type { ReactNode } from "react";

import { useMetronomeStore } from "@/features/metronome";
import { resetMetronomeForTesting } from "@/features/metronome/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { SongMetronomeSheet } from "./song-metronome-sheet";

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

jest.mock("expo-precision-metronome", () => ({
  SOUND_PRESETS: ["click", "beep", "woodblock", "rim", "hihat", "cowbell"],
  setPattern: jest.fn().mockResolvedValue(undefined),
  setSound: jest.fn().mockResolvedValue(undefined),
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseProps = {
  visible: true,
  onClose: jest.fn(),
  songBpm: 90,
  bpm: 120,
  beatPattern: ["strong", "normal", "normal", "normal"] as BeatAccent[],
  currentBeat: -1,
  isPlaying: false,
  onBpmChange: jest.fn().mockResolvedValue(undefined),
  onPlayPause: jest.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  resetMetronomeForTesting();
  jest.clearAllMocks();
});

describe("SongMetronomeSheet", () => {
  test("shows current BPM value", () => {
    const { getByText } = render(<SongMetronomeSheet {...baseProps} />, { wrapper });
    expect(getByText("120")).toBeTruthy();
  });

  test("shows tempo name for current BPM", () => {
    const { getByText } = render(<SongMetronomeSheet {...baseProps} bpm={120} />, {
      wrapper,
    });
    expect(getByText("Аллегро")).toBeTruthy();
  });

  test("'Темп песни' button calls onBpmChange with songBpm", () => {
    const onBpmChange = jest.fn();
    const { getByText } = render(
      <SongMetronomeSheet {...baseProps} songBpm={90} onBpmChange={onBpmChange} />,
      { wrapper },
    );
    fireEvent.press(getByText("Темп песни: 90 BPM"));
    expect(onBpmChange).toHaveBeenCalledWith(90);
  });

  test("hides the 'Темп песни' button when the song has no BPM", () => {
    const { queryByText } = render(<SongMetronomeSheet {...baseProps} songBpm={0} />, {
      wrapper,
    });
    expect(queryByText(/Темп песни/)).toBeNull();
  });

  test("'−10' button calls onBpmChange with bpm − 10", () => {
    const onBpmChange = jest.fn();
    const { getByText } = render(
      <SongMetronomeSheet {...baseProps} bpm={120} onBpmChange={onBpmChange} />,
      { wrapper },
    );
    fireEvent.press(getByText("−10"));
    expect(onBpmChange).toHaveBeenCalledWith(110);
  });

  test("'+10' button calls onBpmChange with bpm + 10", () => {
    const onBpmChange = jest.fn();
    const { getByText } = render(
      <SongMetronomeSheet {...baseProps} bpm={120} onBpmChange={onBpmChange} />,
      { wrapper },
    );
    fireEvent.press(getByText("+10"));
    expect(onBpmChange).toHaveBeenCalledWith(130);
  });

  test("play/pause button calls onPlayPause", () => {
    const onPlayPause = jest.fn();
    const { getAllByRole } = render(
      <SongMetronomeSheet {...baseProps} onPlayPause={onPlayPause} />,
      { wrapper },
    );
    // button order: Темп песни, Sound, Size, −10, −1 (icon), play/pause (icon), +1 (icon), +10
    const buttons = getAllByRole("button");
    fireEvent.press(buttons[5]);
    expect(onPlayPause).toHaveBeenCalled();
  });

  test("shows sound label from store", () => {
    // resetMetronomeForTesting sets soundPreset to "woodblock"
    const { getByText } = render(<SongMetronomeSheet {...baseProps} />, { wrapper });
    expect(getByText("Деревянный щелчок")).toBeTruthy();
  });

  test("cycling sound button advances to next preset in store", () => {
    // default: "woodblock" (index 2 in SOUND_PRESETS), next: "rim" (index 3)
    const { getByText } = render(<SongMetronomeSheet {...baseProps} />, { wrapper });
    fireEvent.press(getByText("Деревянный щелчок"));
    expect(useMetronomeStore.getState().soundPreset).toBe("rim");
  });

  test("cycling pattern button advances to next pattern in store", () => {
    // beatPattern prop is 4/4 (PRESET_SIZES index 2), next preset is 5/4
    const { getByText } = render(<SongMetronomeSheet {...baseProps} />, { wrapper });
    fireEvent.press(getByText("4/4"));
    expect(useMetronomeStore.getState().beatPattern).toEqual([
      "strong",
      "normal",
      "normal",
      "strong",
      "normal",
    ]);
  });
});
