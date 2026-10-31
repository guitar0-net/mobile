// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/lib/themes";

import type { DonationTierView } from "../use-donation-iap";
import { DonationTierRow } from "./donation-tier-row";

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const baseTier: DonationTierView = {
  productId: "tip_thanks",
  label: "Сказать спасибо",
  icon: { ios: "heart.fill", android: "favorite" },
  thanks: "Это правда очень приятно",
  displayPrice: "$1.00",
};

describe("DonationTierRow", () => {
  test("shows the tier label", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState={undefined}
        isPurchasing={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Сказать спасибо")).toBeTruthy();
  });

  test("shows the store's display price once resolved", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState={undefined}
        isPurchasing={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("$1.00")).toBeTruthy();
  });

  test("says the purchase is still being checked while the server has not confirmed", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState="verifying"
        isPurchasing={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Проверяем…")).toBeTruthy();
    expect(screen.queryByText("$1.00")).toBeNull();
  });

  test("says it is waiting for payment while the store collects a slow one", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState="awaiting-payment"
        isPurchasing={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Ожидаем оплату")).toBeTruthy();
    expect(screen.queryByText("$1.00")).toBeNull();
  });

  test("shows a purchasing state instead of the price", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState={undefined}
        isPurchasing={true}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("Покупка…")).toBeTruthy();
  });

  test("calls onPress when tapped and purchasable", () => {
    const onPress = jest.fn();
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState={undefined}
        isPurchasing={false}
        onPress={onPress}
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByText("Сказать спасибо"));

    expect(onPress).toHaveBeenCalled();
  });

  test("does not call onPress while a purchase is still unverified", () => {
    const onPress = jest.fn();
    render(
      <DonationTierRow
        tier={baseTier}
        purchaseState="verifying"
        isPurchasing={false}
        onPress={onPress}
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByText("Сказать спасибо"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
