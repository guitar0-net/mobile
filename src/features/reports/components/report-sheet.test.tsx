// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ComponentProps, ReactNode } from "react";

import { _resetDbForTesting, initDb } from "@/lib/db";
import { ThemeProvider } from "@/lib/themes";

import { flushPendingReports } from "../queue";
import { storage } from "../storage";
import { ReportSheet } from "./report-sheet";

const mockNetworkState = { isInternetReachable: true as boolean | undefined };
jest.mock("expo-network", () => ({
  useNetworkState: () => mockNetworkState,
}));

jest.mock("expo-router", () => ({ useSegments: () => ["song", "[id]"] }));

jest.mock("@/lib/analytics", () => ({ capture: jest.fn() }));

const SONG_ID = "0b6a2f0e-8f3e-4a4e-9d4b-6c1d2f3a4b5c";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderSheet(props: Partial<ComponentProps<typeof ReportSheet>> = {}) {
  return render(
    <ReportSheet
      visible
      onClose={jest.fn()}
      target={{ type: "song", id: SONG_ID }}
      source="song_footer"
      {...props}
    />,
    { wrapper },
  );
}

function sentBodies(): Record<string, unknown>[] {
  return jest
    .mocked(globalThis.fetch)
    .mock.calls.map(([, init]) => JSON.parse(String(init?.body)));
}

beforeEach(async () => {
  storage.clearAll();
  _resetDbForTesting();
  await initDb();
  mockNetworkState.isInternetReachable = true;
  process.env.EXPO_PUBLIC_API_URL = "https://test.example.com";
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response("{}", { status: 201 }));
});

afterEach(async () => {
  await flushPendingReports();
  delete process.env.EXPO_PUBLIC_API_URL;
  jest.restoreAllMocks();
});

test("sending a song report thanks the user and posts the chosen reason", async () => {
  renderSheet();

  expect(screen.getByText("Что не так с песней?")).toBeTruthy();
  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "Am вместо C");
  fireEvent.press(screen.getByText("Отправить"));

  expect(screen.getByText("Спасибо!")).toBeTruthy();
  expect(screen.getByText("Посмотрим и исправим")).toBeTruthy();
  await waitFor(() =>
    expect(sentBodies()).toEqual([
      expect.objectContaining({
        target_type: "song",
        target_id: SONG_ID,
        reason: "wrong_chords",
        message: "Am вместо C",
        screen: "/song/[id]",
      }),
    ]),
  );
});

function sendButton() {
  return screen.getByRole("button", { name: "Отправить" });
}

test("a reason that needs a description cannot be sent without one", () => {
  renderSheet();

  expect(sendButton()).toBeDisabled();
  fireEvent.press(screen.getByText("Другое"));
  expect(screen.getByText("Описание (обязательно)")).toBeTruthy();
  expect(sendButton()).toBeDisabled();

  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "  ");
  expect(sendButton()).toBeDisabled();

  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "Нет припева");
  expect(sendButton()).toBeEnabled();
});

test("without internet the user is told the report will go out later", () => {
  mockNetworkState.isInternetReachable = false;
  renderSheet();

  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.press(sendButton());

  expect(screen.getByText("Отправим, когда появится интернет")).toBeTruthy();
});

test("the thank-you screen closes the sheet on its own", () => {
  jest.useFakeTimers();
  const onClose = jest.fn();
  renderSheet({ onClose });

  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.press(sendButton());
  jest.advanceTimersByTime(2000);

  expect(onClose).toHaveBeenCalled();
  jest.useRealTimers();
});

test("only an app report asks for an email", () => {
  renderSheet();
  expect(screen.queryByPlaceholderText("you@example.com")).toBeNull();

  screen.unmount();
  renderSheet({ target: { type: "app" }, source: "settings" });
  expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
});

test("a malformed email blocks sending", () => {
  renderSheet({ target: { type: "app" }, source: "settings" });

  fireEvent.press(screen.getByText("Ошибка в приложении"));
  fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "user@");
  expect(sendButton()).toBeDisabled();

  fireEvent.changeText(
    screen.getByPlaceholderText("you@example.com"),
    "user@example.com",
  );
  expect(sendButton()).toBeEnabled();
});

test("the last sent email is offered again next time", async () => {
  renderSheet({ target: { type: "app" }, source: "settings" });
  fireEvent.press(screen.getByText("Ошибка в приложении"));
  fireEvent.changeText(
    screen.getByPlaceholderText("you@example.com"),
    "user@example.com",
  );
  fireEvent.press(sendButton());
  await waitFor(() =>
    expect(sentBodies()).toEqual([
      expect.objectContaining({ contact_email: "user@example.com" }),
    ]),
  );

  screen.unmount();
  renderSheet({ target: { type: "app" }, source: "settings" });
  expect(screen.getByPlaceholderText("you@example.com")).toHaveDisplayValue(
    "user@example.com",
  );
});

test("reopening after a sent report starts a fresh form", () => {
  const props = {
    onClose: jest.fn(),
    target: { type: "song", id: SONG_ID },
    source: "song_footer",
  } as const;
  renderSheet(props);
  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.press(sendButton());

  screen.rerender(<ReportSheet visible={false} {...props} />);
  screen.rerender(<ReportSheet visible {...props} />);

  expect(screen.getByText("Что не так с песней?")).toBeTruthy();
  expect(sendButton()).toBeDisabled();
});
