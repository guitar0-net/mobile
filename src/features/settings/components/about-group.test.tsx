// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Alert, Linking } from "react-native";

import { ThemeProvider } from "@/lib/themes";

import { AboutGroup } from "./about-group";
import { resetSettingsForTesting } from "../__tests__/testing";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "9.9.9" } },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  resetSettingsForTesting();
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

function pressVersion(times: number) {
  for (let i = 0; i < times; i++) fireEvent.press(screen.getByText("Версия"));
}

function infoIconShown() {
  const icon = screen.UNSAFE_getAllByType(SymbolView)[0]?.props.name;
  return icon?.ios === "info.circle";
}

describe("AboutGroup", () => {
  test("shows the app version from expo config", () => {
    render(<AboutGroup />, { wrapper });
    expect(screen.getByText("9.9.9")).toBeTruthy();
  });

  test("opens the GitHub repo URL when the GitHub row is pressed", () => {
    render(<AboutGroup />, { wrapper });
    fireEvent.press(screen.getByText("GitHub"));
    expect(Linking.openURL).toHaveBeenCalledWith("https://github.com/guitar0-net");
  });

  test("opens a mailto link when the contact developer row is pressed", () => {
    render(<AboutGroup />, { wrapper });
    fireEvent.press(screen.getByText("Написать разработчику"));
    expect(Linking.openURL).toHaveBeenCalledWith("mailto:guitar0.app@gmail.com");
  });

  test("stays quiet until the version row has been tapped seven times", () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<AboutGroup />, { wrapper });

    pressVersion(6);
    expect(alert).not.toHaveBeenCalled();
    expect(screen.queryByText("🎸")).toBeNull();
    expect(infoIconShown()).toBe(true);

    pressVersion(1);
    expect(alert).toHaveBeenCalledWith("Вы стали гитаристом 🎸", "Теперь официально.");
    expect(screen.getByText("🎸")).toBeTruthy();
    expect(infoIconShown()).toBe(false);
  });

  test("keeps the guitar emoji after a remount and greets a repeat tapper at once", () => {
    render(<AboutGroup />, { wrapper });
    pressVersion(7);
    screen.unmount();

    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<AboutGroup />, { wrapper });
    expect(screen.getByText("🎸")).toBeTruthy();

    pressVersion(1);
    expect(alert).toHaveBeenCalledWith("Вы уже гитарист 🎸");
  });

  test("shows the address in an alert when no mail client can open the link", async () => {
    jest.spyOn(Linking, "openURL").mockRejectedValue(new Error("no handler"));
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    render(<AboutGroup />, { wrapper });
    fireEvent.press(screen.getByText("Написать разработчику"));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith(
        "Почтовый клиент не найден",
        "Напишите нам на guitar0.app@gmail.com",
      );
    });
  });
});
