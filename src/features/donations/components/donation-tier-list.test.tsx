// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import { useDonationIap } from "../use-donation-iap";
import { DonationTierList } from "./donation-tier-list";

jest.mock("../use-donation-iap");

const mockUseDonationIap = jest.mocked(useDonationIap);

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const defaults: ReturnType<typeof useDonationIap> = {
  tiers: [],
  isLoading: false,
  loadError: null,
  refetch: jest.fn(),
  purchaseStates: new Map(),
  purchasingProductId: null,
  thanks: null,
  errorMessage: null,
  purchase: jest.fn(),
};

beforeEach(() => {
  mockUseDonationIap.mockReturnValue({ ...defaults });
});

describe("DonationTierList", () => {
  test("blames the connection when the server withheld the tier list", () => {
    const refetch = jest.fn();
    mockUseDonationIap.mockReturnValue({ ...defaults, loadError: "catalog", refetch });

    render(<DonationTierList />, { wrapper });

    expect(
      screen.getByText(
        "Не удалось загрузить варианты поддержки. Проверьте подключение к интернету",
      ),
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Повторить"));
    expect(refetch).toHaveBeenCalled();
  });

  test("blames the store, not the connection, when the store withheld its prices", () => {
    const refetch = jest.fn();
    mockUseDonationIap.mockReturnValue({ ...defaults, loadError: "store", refetch });

    render(<DonationTierList />, { wrapper });

    expect(
      screen.getByText("Магазин недоступен. Попробуйте ещё раз позже"),
    ).toBeTruthy();
    fireEvent.press(screen.getByText("Повторить"));
    expect(refetch).toHaveBeenCalled();
  });

  test("shows a loading message while tiers are resolving", () => {
    mockUseDonationIap.mockReturnValue({ ...defaults, isLoading: true });

    render(<DonationTierList />, { wrapper });

    expect(screen.getByText("Загрузка…")).toBeTruthy();
  });

  test("shows an unavailable message when no tiers are active", () => {
    render(<DonationTierList />, { wrapper });

    expect(screen.getByText("Сейчас поддержка временно недоступна")).toBeTruthy();
  });

  test("renders a row for every visible tier and no restore button", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      tiers: [
        {
          productId: "tip_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          thanks: "Это правда очень приятно",
          displayPrice: "$1.00",
        },
        {
          productId: "tip_coffee",
          label: "Угостить кофе",
          icon: { ios: "cup.and.saucer.fill", android: "local_cafe" },
          thanks: "Самый вкусный кофе — подаренный",
          displayPrice: "$3.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(screen.getByText("Сказать спасибо")).toBeTruthy();
    expect(screen.getByText("Угостить кофе")).toBeTruthy();
    expect(screen.queryByText("Восстановить покупки")).toBeNull();
  });

  test("taps a tier row through to purchase(productId)", () => {
    const purchase = jest.fn();
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      purchase,
      tiers: [
        {
          productId: "tip_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          thanks: "Это правда очень приятно",
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });
    fireEvent.press(screen.getByText("Сказать спасибо"));

    expect(purchase).toHaveBeenCalledWith("tip_thanks");
  });

  test("says a purchase is still being checked while the server has not confirmed it", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      purchaseStates: new Map([["tip_thanks", "verifying" as const]]),
      tiers: [
        {
          productId: "tip_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          thanks: "Это правда очень приятно",
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(screen.getByText("Проверяем…")).toBeTruthy();
    expect(screen.queryByText("$1.00")).toBeNull();
  });

  test("shows an inline error message from the purchase hook", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      errorMessage: "Покупка ещё не подтверждена. Мы попробуем ещё раз позже",
      tiers: [
        {
          productId: "tip_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          thanks: "Это правда очень приятно",
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(
      screen.getByText("Покупка ещё не подтверждена. Мы попробуем ещё раз позже"),
    ).toBeTruthy();
  });

  test("thanks the donor for the tier just bought and keeps its price on the row", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      thanks: { productId: "tip_coffee", transactionId: "txn-1" },
      tiers: [
        {
          productId: "tip_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          thanks: "Это правда очень приятно",
          displayPrice: "$1.00",
        },
        {
          productId: "tip_coffee",
          label: "Угостить кофе",
          icon: { ios: "cup.and.saucer.fill", android: "local_cafe" },
          thanks: "Самый вкусный кофе — подаренный",
          displayPrice: "$3.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(screen.getByText("Спасибо за поддержку!")).toBeTruthy();
    expect(screen.getByText("Самый вкусный кофе — подаренный")).toBeTruthy();
    expect(screen.queryByText("Это правда очень приятно")).toBeNull();
    expect(screen.getByText("$3.00")).toBeTruthy();
  });

  test("shows no thanks before anything is bought", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      tiers: [
        {
          productId: "tip_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          thanks: "Это правда очень приятно",
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(screen.queryByText("Спасибо за поддержку!")).toBeNull();
  });
});
