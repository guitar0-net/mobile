// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";

import type { SchemeImageState } from "@/features/lessons";
import { ThemeProvider } from "@/lib/themes";

import { SchemeImage } from "./scheme-image";

const mockUseSchemeImage = jest.fn<SchemeImageState, []>();

jest.mock("@/features/lessons", () => ({
  useSchemeImage: () => mockUseSchemeImage(),
}));

jest.mock("react-native-reanimated", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: { View },
    Easing: { inOut: () => undefined, ease: undefined },
    cancelAnimation: jest.fn(),
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: () => ({}),
    withRepeat: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

function renderSchemeImage() {
  render(
    <SchemeImage
      scheme={{
        id: 7,
        image: "/media/beat7.jpg",
        inscription: null,
        width: null,
        height: null,
        localImagePath: null,
      }}
      width={120}
      height={40}
    />,
    { wrapper },
  );
}

describe("SchemeImage", () => {
  test("shows a skeleton while the image is loading", () => {
    mockUseSchemeImage.mockReturnValue({ state: "loading" });

    renderSchemeImage();

    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.queryByText("Повторить")).toBeNull();
  });

  test("pressing retry on a failed image downloads it again", () => {
    const retry = jest.fn();
    mockUseSchemeImage.mockReturnValue({ state: "failed", retry });

    renderSchemeImage();
    fireEvent.press(screen.getByLabelText("Повторить загрузку схемы"));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});
