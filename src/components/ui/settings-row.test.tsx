// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Switch } from "react-native";

import { ThemeProvider } from "@/lib/themes";

import { SettingsRow } from "./settings-row";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const icon = { ios: "music.note" as const, android: "music_note" as const };

describe("SettingsRow — nav type", () => {
  test("renders label text", () => {
    const { getByText } = render(
      <SettingsRow type="nav" icon={icon} iconBgColor="#FF0000" label="Звук" />,
      { wrapper },
    );
    expect(getByText("Звук")).toBeTruthy();
  });

  test("renders sublabel when provided", () => {
    const { getByText } = render(
      <SettingsRow
        type="nav"
        icon={icon}
        iconBgColor="#FF0000"
        label="Звук"
        sublabel="Деревянный щелчок"
      />,
      { wrapper },
    );
    expect(getByText("Деревянный щелчок")).toBeTruthy();
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingsRow
        type="nav"
        icon={icon}
        iconBgColor="#FF0000"
        label="Звук"
        onPress={onPress}
      />,
      { wrapper },
    );
    fireEvent.press(getByText("Звук"));
    expect(onPress).toHaveBeenCalled();
  });

  test("does not render a Switch", () => {
    const { UNSAFE_queryAllByType } = render(
      <SettingsRow type="nav" icon={icon} iconBgColor="#FF0000" label="Звук" />,
      { wrapper },
    );
    expect(UNSAFE_queryAllByType(Switch)).toHaveLength(0);
  });
});

describe("SettingsRow — toggle type", () => {
  test("renders label text", () => {
    const { getByText } = render(
      <SettingsRow
        type="toggle"
        icon={icon}
        iconBgColor="#22C55E"
        label="Подсветка экрана"
        value={false}
        onChange={jest.fn()}
      />,
      { wrapper },
    );
    expect(getByText("Подсветка экрана")).toBeTruthy();
  });

  test("renders a Switch with the given value", () => {
    const { UNSAFE_getByType } = render(
      <SettingsRow
        type="toggle"
        icon={icon}
        iconBgColor="#22C55E"
        label="Подсветка экрана"
        value={true}
        onChange={jest.fn()}
      />,
      { wrapper },
    );
    expect(UNSAFE_getByType(Switch).props.value).toBe(true);
  });

  test("calls onChange when switch value changes", () => {
    const onChange = jest.fn();
    const { UNSAFE_getByType } = render(
      <SettingsRow
        type="toggle"
        icon={icon}
        iconBgColor="#22C55E"
        label="Подсветка экрана"
        value={false}
        onChange={onChange}
      />,
      { wrapper },
    );
    fireEvent(UNSAFE_getByType(Switch), "valueChange", true);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe("SettingsRow — external type", () => {
  test("renders the external-link icon, not the nav chevron", () => {
    const { UNSAFE_getAllByType } = render(
      <SettingsRow type="external" icon={icon} iconBgColor="#3366FF" label="GitHub" />,
      { wrapper },
    );
    const symbolNames = UNSAFE_getAllByType(SymbolView).map((el) => el.props.name);
    expect(symbolNames).toContainEqual({
      ios: "arrow.up.right",
      android: "open_in_new",
    });
    expect(symbolNames).not.toContainEqual({
      ios: "chevron.right",
      android: "chevron_right",
    });
  });

  test("calls onPress when pressed", () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SettingsRow
        type="external"
        icon={icon}
        iconBgColor="#3366FF"
        label="GitHub"
        onPress={onPress}
      />,
      { wrapper },
    );
    fireEvent.press(getByText("GitHub"));
    expect(onPress).toHaveBeenCalled();
  });
});
