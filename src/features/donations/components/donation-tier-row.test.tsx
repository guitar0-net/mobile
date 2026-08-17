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
  productId: "donation_thanks",
  label: "Сказать спасибо",
  icon: { ios: "heart.fill", android: "favorite" },
  displayPrice: "$1.00",
};

describe("DonationTierRow", () => {
  test("shows the tier label", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        isOwned={false}
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
        isOwned={false}
        isPurchasing={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.getByText("$1.00")).toBeTruthy();
  });

  test("shows a checkmark and hides the price once owned", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        isOwned={true}
        isPurchasing={false}
        onPress={jest.fn()}
      />,
      { wrapper },
    );
    expect(screen.queryByText("$1.00")).toBeNull();
  });

  test("shows a purchasing state instead of the price", () => {
    render(
      <DonationTierRow
        tier={baseTier}
        isOwned={false}
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
        isOwned={false}
        isPurchasing={false}
        onPress={onPress}
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByText("Сказать спасибо"));

    expect(onPress).toHaveBeenCalled();
  });

  test("does not call onPress once already owned", () => {
    const onPress = jest.fn();
    render(
      <DonationTierRow
        tier={baseTier}
        isOwned={true}
        isPurchasing={false}
        onPress={onPress}
      />,
      { wrapper },
    );

    fireEvent.press(screen.getByText("Сказать спасибо"));

    expect(onPress).not.toHaveBeenCalled();
  });
});
