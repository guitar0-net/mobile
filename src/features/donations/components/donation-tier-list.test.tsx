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
  isRestoring: false,
  errorMessage: null,
  purchase: jest.fn(),
  restore: jest.fn(),
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

  test("renders a row for every visible tier and a restore button", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      tiers: [
        {
          productId: "donation_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          displayPrice: "$1.00",
        },
        {
          productId: "donation_coffee",
          label: "Угостить кофе",
          icon: { ios: "cup.and.saucer.fill", android: "local_cafe" },
          displayPrice: "$3.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(screen.getByText("Сказать спасибо")).toBeTruthy();
    expect(screen.getByText("Угостить кофе")).toBeTruthy();
    expect(screen.getByText("Восстановить покупки")).toBeTruthy();
  });

  test("taps a tier row through to purchase(productId)", () => {
    const purchase = jest.fn();
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      purchase,
      tiers: [
        {
          productId: "donation_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });
    fireEvent.press(screen.getByText("Сказать спасибо"));

    expect(purchase).toHaveBeenCalledWith("donation_thanks");
  });

  test("shows a checkmark for a confirmed tier instead of its price", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      purchaseStates: new Map([["donation_thanks", "confirmed" as const]]),
      tiers: [
        {
          productId: "donation_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(screen.queryByText("$1.00")).toBeNull();
    expect(screen.queryByText("Проверяем…")).toBeNull();
  });

  test("says a purchase is still being checked while the server has not confirmed it", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      purchaseStates: new Map([["donation_thanks", "pending" as const]]),
      tiers: [
        {
          productId: "donation_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
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
          productId: "donation_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });

    expect(
      screen.getByText("Покупка ещё не подтверждена. Мы попробуем ещё раз позже"),
    ).toBeTruthy();
  });

  test("calls restore when the restore button is pressed", () => {
    const restore = jest.fn();
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      restore,
      tiers: [
        {
          productId: "donation_thanks",
          label: "Сказать спасибо",
          icon: { ios: "heart.fill", android: "favorite" },
          displayPrice: "$1.00",
        },
      ],
    });

    render(<DonationTierList />, { wrapper });
    fireEvent.press(screen.getByText("Восстановить покупки"));

    expect(restore).toHaveBeenCalled();
  });
});
