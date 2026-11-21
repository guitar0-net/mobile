// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement, ReactNode } from "react";

import { _resetDbForTesting, initDb } from "@/lib/db";
import { ThemeProvider } from "@/lib/themes";

import { flushPendingReports } from "../queue";
import type { ReportRouteParams } from "../report-route";
import { storage } from "../storage";
import { ReportScreen } from "./report-screen";

const mockNetworkState = { isInternetReachable: true as boolean | undefined };
jest.mock("expo-network", () => ({
  useNetworkState: () => mockNetworkState,
}));

type ScreenOptions = { gestureEnabled?: boolean; headerLeft?: () => ReactElement };

let mockParams: ReportRouteParams = {};
let mockScreenOptions: ScreenOptions = {};
const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack }),
  Stack: {
    Screen: ({ options }: { options: ScreenOptions }) => {
      mockScreenOptions = options;
      return null;
    },
  },
}));
jest.mock("expo-router/react-navigation", () => ({ useHeaderHeight: () => 0 }));

jest.mock("@/lib/analytics", () => ({ capture: jest.fn() }));

const SONG_ID = "0b6a2f0e-8f3e-4a4e-9d4b-6c1d2f3a4b5c";
const SONG_PARAMS = {
  type: "song",
  id: SONG_ID,
  source: "song_footer",
  from: "/song/[id]",
};
const APP_PARAMS = { type: "app", source: "settings", from: "/settings" };

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderScreen(params: ReportRouteParams = SONG_PARAMS) {
  mockParams = params;
  return render(<ReportScreen />, { wrapper });
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
  mockScreenOptions = {};
  mockBack.mockClear();
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
  renderScreen();

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

test.each([
  ["Ошибка в приложении", "Посмотрим и исправим"],
  ["Предложить функцию", "Спасибо за идею, обязательно рассмотрим"],
  ["Другое", "Обязательно прочитаем"],
])("an app report for «%s» thanks the user with «%s»", (reasonTitle, thanks) => {
  renderScreen(APP_PARAMS);

  fireEvent.press(screen.getByText(reasonTitle));
  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "Текст");
  fireEvent.press(screen.getByText("Отправить"));

  expect(screen.getByText(thanks)).toBeTruthy();
});

function sendButton() {
  return screen.getByRole("button", { name: "Отправить" });
}

test("sending without a reason asks to choose one", () => {
  renderScreen();
  expect(screen.queryByText("Выберите причину")).toBeNull();

  fireEvent.press(sendButton());
  expect(screen.getByText("Выберите причину")).toBeTruthy();
  expect(screen.queryByText("Спасибо!")).toBeNull();

  fireEvent.press(screen.getByText("Неверные аккорды"));
  expect(screen.queryByText("Выберите причину")).toBeNull();
});

test("a reason that needs a description is not sent without one", () => {
  renderScreen();

  expect(screen.getByText("Описание (необязательно)")).toBeTruthy();
  fireEvent.press(screen.getByText("Другое"));
  expect(screen.getByText("Описание")).toBeTruthy();

  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "  ");
  fireEvent.press(sendButton());
  expect(screen.getByText("Опишите, что не так")).toBeTruthy();
  expect(screen.queryByText("Спасибо!")).toBeNull();

  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "Нет припева");
  expect(screen.queryByText("Опишите, что не так")).toBeNull();
  fireEvent.press(sendButton());
  expect(screen.getByText("Спасибо!")).toBeTruthy();
});

test.each(["Ошибка в приложении", "Предложить функцию", "Другое"])(
  "an app report for «%s» needs a description",
  (reasonTitle) => {
    renderScreen(APP_PARAMS);

    fireEvent.press(screen.getByText(reasonTitle));
    fireEvent.press(sendButton());

    expect(screen.getByText("Опишите, что не так")).toBeTruthy();
  },
);

test("without internet the user is told the report will go out later", () => {
  mockNetworkState.isInternetReachable = false;
  renderScreen();

  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.press(sendButton());

  expect(screen.getByText("Отправим, когда появится интернет")).toBeTruthy();
});

test("the thank-you screen closes the form on its own", () => {
  jest.useFakeTimers();
  renderScreen();

  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.press(sendButton());
  jest.advanceTimersByTime(2000);

  expect(mockBack).toHaveBeenCalled();
  jest.useRealTimers();
});

test("only an app report asks for an email", () => {
  renderScreen();
  expect(screen.queryByPlaceholderText("you@example.com")).toBeNull();

  screen.unmount();
  renderScreen(APP_PARAMS);
  expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
});

function fillAppReport() {
  fireEvent.press(screen.getByText("Ошибка в приложении"));
  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "Вылетает");
}

test("a malformed email is flagged once the user leaves the field", () => {
  renderScreen(APP_PARAMS);
  const emailInput = screen.getByPlaceholderText("you@example.com");

  fireEvent.changeText(emailInput, "user@");
  expect(screen.queryByText("Проверьте адрес")).toBeNull();

  fireEvent(emailInput, "blur");
  expect(screen.getByText("Проверьте адрес")).toBeTruthy();

  fireEvent.changeText(emailInput, "user@example.com");
  expect(screen.queryByText("Проверьте адрес")).toBeNull();
});

test("a malformed email blocks sending", () => {
  renderScreen(APP_PARAMS);
  fillAppReport();

  fireEvent.changeText(screen.getByPlaceholderText("you@example.com"), "user@");
  fireEvent.press(sendButton());

  expect(screen.getByText("Проверьте адрес")).toBeTruthy();
  expect(screen.queryByText("Посмотрим и исправим")).toBeNull();
});

test("the last sent email is offered again next time", async () => {
  renderScreen(APP_PARAMS);
  fillAppReport();
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
  renderScreen(APP_PARAMS);
  expect(screen.getByPlaceholderText("you@example.com")).toHaveDisplayValue(
    "user@example.com",
  );
});

test("invalid route params close the screen without showing a form", () => {
  renderScreen({ type: "song", source: "song_footer", from: "/song/[id]" });

  expect(screen.queryByText("Отправить")).toBeNull();
  expect(mockBack).toHaveBeenCalled();
});

test("swipe to close is blocked while the description holds text", () => {
  renderScreen();
  expect(mockScreenOptions.gestureEnabled).toBe(true);

  fireEvent.changeText(screen.getByPlaceholderText("Что именно не так"), "Am вместо C");
  expect(mockScreenOptions.gestureEnabled).toBe(false);

  fireEvent.press(screen.getByText("Неверные аккорды"));
  fireEvent.press(sendButton());
  expect(mockScreenOptions.gestureEnabled).toBe(true);
});

test("the header close button closes the screen", () => {
  renderScreen();
  const headerLeft = mockScreenOptions.headerLeft;
  if (!headerLeft) throw new Error("no header button");
  render(headerLeft(), { wrapper });

  fireEvent.press(screen.getByLabelText("Закрыть"));

  expect(mockBack).toHaveBeenCalled();
});
