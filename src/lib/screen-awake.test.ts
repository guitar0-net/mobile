// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { renderHook } from "@testing-library/react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

import { useScreenAwake } from "./screen-awake";

jest.mock("expo-keep-awake", () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));

const activate = jest.mocked(activateKeepAwakeAsync);
const deactivate = jest.mocked(deactivateKeepAwake);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useScreenAwake", () => {
  test("does not keep the screen on while inactive", () => {
    renderHook(() => useScreenAwake(false));
    expect(activate).not.toHaveBeenCalled();
  });

  test("releases the screen when the component unmounts while active", () => {
    const { unmount } = renderHook(() => useScreenAwake(true));
    const tag = activate.mock.calls[0][0];

    unmount();

    expect(deactivate).toHaveBeenCalledWith(tag);
  });

  test("releases the screen when it becomes inactive", () => {
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useScreenAwake(active),
      {
        initialProps: { active: true },
      },
    );
    const tag = activate.mock.calls[0][0];

    rerender({ active: false });

    expect(deactivate).toHaveBeenCalledWith(tag);
  });

  test("never uses the default tag that Expo dev tools hold", () => {
    renderHook(() => useScreenAwake(true));
    const tag = activate.mock.calls[0][0];

    expect(tag).toBeDefined();
    expect(tag).not.toBe("ExpoKeepAwakeDefaultTag");
  });

  test("gives each caller its own tag", () => {
    renderHook(() => useScreenAwake(true));
    renderHook(() => useScreenAwake(true));

    expect(activate.mock.calls[0][0]).not.toBe(activate.mock.calls[1][0]);
  });
});
