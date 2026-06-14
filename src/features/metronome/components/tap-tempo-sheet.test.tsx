// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { act, fireEvent, render } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { TapTempoSheet } from "./tap-tempo-sheet";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("TapTempoSheet", () => {
  test("shows initial prompt when no taps", () => {
    const { getByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );
    expect(getByText("Нажимай в такт музыке")).toBeTruthy();
  });

  test("close button initially shows 'Закрыть'", () => {
    const { getAllByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );
    expect(getAllByText("Закрыть").length).toBeGreaterThan(0);
  });

  test("shows 'Ещё раз...' after first tap", () => {
    const { getByText, queryByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );
    const tapArea = getByText("Нажимай в такт музыке");

    jest.setSystemTime(0);
    act(() => fireEvent.press(tapArea));

    expect(getByText("Ещё раз...")).toBeTruthy();
    expect(queryByText("Нажимай в такт музыке")).toBeNull();
  });

  test("shows '1 нажатие' label after first tap", () => {
    const { getByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );

    jest.setSystemTime(0);
    act(() => fireEvent.press(getByText("Нажимай в такт музыке")));

    expect(getByText("1 нажатие")).toBeTruthy();
  });

  test("shows plural нажатия for 2–4 taps", () => {
    const { getByText, queryByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );

    jest.setSystemTime(0);
    act(() => fireEvent.press(getByText("Нажимай в такт музыке")));
    jest.setSystemTime(500);
    act(() => fireEvent.press(queryByText("Ещё раз...") ?? getByText("1 нажатие")));

    expect(getByText("2 нажатия")).toBeTruthy();
  });

  test("shows нажатий for 5+ taps", () => {
    const { getByText, queryByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );

    // The tap area shows different content at each stage; "BPM" text is always
    // present after the 2nd tap regardless of the computed BPM value.
    const getTapTarget = (i: number) => {
      if (i === 0) return getByText("Нажимай в такт музыке");
      if (i === 1) return queryByText("Ещё раз...") ?? getByText("BPM");
      return getByText("BPM");
    };

    for (let i = 0; i < 5; i++) {
      jest.setSystemTime(i * 500);
      act(() => fireEvent.press(getTapTarget(i)));
    }

    expect(getByText("5 нажатий")).toBeTruthy();
  });

  test("calls onClose and resets when close button is pressed", () => {
    const onClose = jest.fn();
    const { getAllByText, getByText } = render(
      <TapTempoSheet visible onClose={onClose} onBpmChange={jest.fn()} />,
      { wrapper },
    );

    jest.setSystemTime(0);
    act(() => fireEvent.press(getByText("Нажимай в такт музыке")));

    const closeButtons = getAllByText("Закрыть");
    act(() => fireEvent.press(closeButtons[closeButtons.length - 1]));

    expect(onClose).toHaveBeenCalled();
  });

  test("reset button clears tap count", () => {
    const { getByText } = render(
      <TapTempoSheet visible onClose={jest.fn()} onBpmChange={jest.fn()} />,
      { wrapper },
    );

    jest.setSystemTime(0);
    act(() => fireEvent.press(getByText("Нажимай в такт музыке")));
    expect(getByText("1 нажатие")).toBeTruthy();

    act(() => fireEvent.press(getByText("Сбросить")));

    expect(getByText("Нажимай в такт музыке")).toBeTruthy();
  });
});
