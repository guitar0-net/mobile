// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render } from "@testing-library/react-native";

import { LottieAnimation } from "./lottie-animation";

describe("LottieAnimation", () => {
  test("renders without a size by default", () => {
    const { toJSON } = render(<LottieAnimation source="anim.json" />);
    const tree = toJSON() as unknown as Record<string, unknown>;
    expect((tree.props as { style: unknown }).style).toBeUndefined();
  });

  test("converts size into a square style", () => {
    const { toJSON } = render(<LottieAnimation source="anim.json" size={64} />);
    const tree = toJSON() as unknown as Record<string, unknown>;
    expect(
      (tree.props as { style: { width: number; height: number } }).style,
    ).toMatchObject({ width: 64, height: 64 });
  });

  test("defaults loop and autoPlay to true", () => {
    const { toJSON } = render(<LottieAnimation source="anim.json" />);
    const tree = toJSON() as unknown as Record<string, unknown>;
    expect(tree.props).toMatchObject({ loop: true, autoPlay: true });
  });

  test("respects explicit loop and autoPlay overrides", () => {
    const { toJSON } = render(
      <LottieAnimation source="anim.json" loop={false} autoPlay={false} />,
    );
    const tree = toJSON() as unknown as Record<string, unknown>;
    expect(tree.props).toMatchObject({ loop: false, autoPlay: false });
  });
});
