// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert, Linking } from "react-native";

import { ThemeProvider } from "@/lib/themes";

import { AboutGroup } from "./about-group";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "9.9.9" } },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

beforeEach(() => {
  jest.spyOn(Linking, "openURL").mockResolvedValue(true);
});

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
