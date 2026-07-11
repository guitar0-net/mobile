// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { resetSettingsForTesting } from "@/features/settings/__tests__/testing";
import { ThemeProvider } from "@/lib/themes";

import { getDeviceId } from "../device-id";
import { storage } from "../storage";
import { ProfileHeader } from "./profile-header";

beforeEach(() => {
  storage.clearAll();
  resetSettingsForTesting();
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe("ProfileHeader", () => {
  test("shows the local profile label", () => {
    render(<ProfileHeader />, { wrapper });
    expect(screen.getByText("Локальный профиль")).toBeTruthy();
  });

  test("shows the device id truncated to 8 characters", () => {
    const fullId = getDeviceId();
    render(<ProfileHeader />, { wrapper });
    expect(screen.getByText(`ID устройства: ${fullId.slice(0, 8)}`)).toBeTruthy();
  });

  test("shows the local-storage-only badge", () => {
    render(<ProfileHeader />, { wrapper });
    expect(
      screen.getByText("Прогресс хранится только на этом устройстве"),
    ).toBeTruthy();
  });

  test("does not render a sign-in button", () => {
    render(<ProfileHeader />, { wrapper });
    expect(screen.queryByText(/Войти/)).toBeNull();
  });
});
