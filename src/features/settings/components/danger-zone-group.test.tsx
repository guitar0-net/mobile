// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { Alert } from "react-native";

import { deleteAllDownloadedVideos } from "@/features/lessons";
import { ThemeProvider } from "@/lib/themes";

import { resetSettingsForTesting } from "../__tests__/testing";
import { resetProgress } from "../store";
import { DangerZoneGroup } from "./danger-zone-group";

jest.mock("@/features/lessons", () => ({
  deleteAllDownloadedVideos: jest.fn(),
}));

jest.mock("@/features/activity", () => ({
  resetActivity: jest.fn(),
}));

jest.mock("../store", () => ({
  ...jest.requireActual("../store"),
  resetProgress: jest.fn(),
}));

const mockResetProgress = resetProgress as jest.MockedFunction<typeof resetProgress>;
const mockDeleteAllDownloadedVideos = deleteAllDownloadedVideos as jest.MockedFunction<
  typeof deleteAllDownloadedVideos
>;

type AlertButton = { text: string; style?: string; onPress?: () => void };

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderGroup() {
  return render(<DangerZoneGroup />, { wrapper });
}

function alertButtons(callIndex: number): AlertButton[] {
  return (Alert.alert as jest.Mock).mock.calls[callIndex][2] as AlertButton[];
}

function pressAlertButton(call: unknown[], label: string) {
  const buttons = call[2] as AlertButton[];
  const button = buttons.find((b) => b.text === label);
  button?.onPress?.();
}

beforeEach(() => {
  resetSettingsForTesting();
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

describe("DangerZoneGroup", () => {
  test("renders the section title and both action labels", () => {
    renderGroup();
    expect(screen.getByText("Опасная зона")).toBeTruthy();
    expect(screen.getByText("Удалить все загруженные видео")).toBeTruthy();
    expect(screen.getByText("Сбросить весь прогресс")).toBeTruthy();
  });

  describe("delete all downloaded videos", () => {
    test("shows a single destructive confirmation and deletes on confirm", () => {
      renderGroup();

      fireEvent.press(screen.getByText("Удалить все загруженные видео"));

      expect(Alert.alert).toHaveBeenCalledTimes(1);
      const call = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertButtons(0);
      expect(buttons.some((b) => b.style === "destructive")).toBe(true);

      pressAlertButton(call, buttons.find((b) => b.style === "destructive")!.text);
      expect(mockDeleteAllDownloadedVideos).toHaveBeenCalledTimes(1);
    });

    test("dismissing the confirmation does not delete anything", () => {
      renderGroup();

      fireEvent.press(screen.getByText("Удалить все загруженные видео"));

      const call = (Alert.alert as jest.Mock).mock.calls[0];
      const buttons = alertButtons(0);
      pressAlertButton(call, buttons.find((b) => b.style === "cancel")!.text);

      expect(mockDeleteAllDownloadedVideos).not.toHaveBeenCalled();
    });
  });

  describe("reset all progress", () => {
    function pressResetButton() {
      fireEvent.press(screen.getByText("Сбросить весь прогресс"));
    }

    function confirmDialog(callIndex: number) {
      const buttons = alertButtons(callIndex);
      const confirmButton = buttons.find((b) => b.style === "destructive")!;
      confirmButton.onPress?.();
      return buttons;
    }

    function cancelDialog(callIndex: number) {
      const buttons = alertButtons(callIndex);
      const cancelButton = buttons.find((b) => b.style === "cancel")!;
      cancelButton.onPress?.();
      return buttons;
    }

    test("requires two sequential confirmations before resetting", () => {
      renderGroup();
      pressResetButton();
      expect(Alert.alert).toHaveBeenCalledTimes(1);

      confirmDialog(0);
      expect(Alert.alert).toHaveBeenCalledTimes(2);
      expect(mockResetProgress).not.toHaveBeenCalled();

      confirmDialog(1);
      expect(mockResetProgress).toHaveBeenCalledTimes(1);
    });

    test("second dialog uses different button positions than the first, to defeat a reflexive same-position tap", () => {
      renderGroup();
      pressResetButton();

      const firstButtons = alertButtons(0);
      confirmDialog(0);
      const secondButtons = alertButtons(1);

      const firstConfirmIndex = firstButtons.findIndex(
        (b) => b.style === "destructive",
      );
      const secondConfirmIndex = secondButtons.findIndex(
        (b) => b.style === "destructive",
      );
      expect(secondConfirmIndex).not.toBe(firstConfirmIndex);
    });

    test("second dialog uses distinct copy, not a plain repeat of the first", () => {
      renderGroup();
      pressResetButton();
      const firstTitle = (Alert.alert as jest.Mock).mock.calls[0][0];
      const firstMessage = (Alert.alert as jest.Mock).mock.calls[0][1];

      confirmDialog(0);
      const secondTitle = (Alert.alert as jest.Mock).mock.calls[1][0];
      const secondMessage = (Alert.alert as jest.Mock).mock.calls[1][1];

      expect(secondTitle).not.toBe(firstTitle);
      expect(secondMessage).not.toBe(firstMessage);
    });

    test("dismissing the first dialog performs no destructive action", () => {
      renderGroup();
      pressResetButton();
      cancelDialog(0);

      expect(Alert.alert).toHaveBeenCalledTimes(1);
      expect(mockResetProgress).not.toHaveBeenCalled();
    });

    test("dismissing the second dialog performs no destructive action", () => {
      renderGroup();
      pressResetButton();
      confirmDialog(0);
      cancelDialog(1);

      expect(mockResetProgress).not.toHaveBeenCalled();
    });

    test("confirming both dialogs clears progress and activity", async () => {
      const { resetActivity } = jest.requireMock("@/features/activity") as {
        resetActivity: jest.Mock;
      };

      renderGroup();
      pressResetButton();
      confirmDialog(0);
      confirmDialog(1);

      expect(mockResetProgress).toHaveBeenCalledTimes(1);
      expect(resetActivity).toHaveBeenCalledTimes(1);
    });
  });
});
