// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { SongRow } from "./song-row";

beforeEach(() => {
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("SongRow", () => {
  test("renders song title", () => {
    render(<SongRow title="Am" completed={false} metronome={0} onPress={jest.fn()} />, {
      wrapper,
    });
    expect(screen.getByText("Am")).toBeTruthy();
  });

  test("renders BPM badge when metronome > 0", () => {
    render(
      <SongRow title="Em" completed={false} metronome={120} onPress={jest.fn()} />,
      { wrapper },
    );
    expect(screen.getByText("120 BPM")).toBeTruthy();
  });

  test("does not render BPM badge when metronome is 0", () => {
    render(<SongRow title="Am" completed={false} metronome={0} onPress={jest.fn()} />, {
      wrapper,
    });
    expect(screen.queryByText(/BPM/)).toBeNull();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    render(<SongRow title="Am" completed={false} metronome={0} onPress={onPress} />, {
      wrapper,
    });
    fireEvent.press(screen.getByText("Am"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("renders title of completed song", () => {
    render(<SongRow title="Dm" completed={true} metronome={0} onPress={jest.fn()} />, {
      wrapper,
    });
    expect(screen.getByText("Dm")).toBeTruthy();
  });
});
