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
  isError: false,
  refetch: jest.fn(),
  ownedProductIds: new Set(),
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
  test("shows an error with a retry button when loading failed", () => {
    const refetch = jest.fn();
    mockUseDonationIap.mockReturnValue({ ...defaults, isError: true, refetch });

    render(<DonationTierList />, { wrapper });

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

  test("shows a checkmark for an owned tier instead of its price", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      ownedProductIds: new Set(["donation_thanks"]),
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
  });

  test("shows an inline error message from the purchase hook", () => {
    mockUseDonationIap.mockReturnValue({
      ...defaults,
      errorMessage: "Магазин временно недоступен. Попробуйте ещё раз позже",
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
      screen.getByText("Магазин временно недоступен. Попробуйте ещё раз позже"),
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
