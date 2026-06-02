// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render } from "@testing-library/react-native";

import { AppIcon } from "./app-icon";

describe("AppIcon", () => {
  test("renders with default size of 100", () => {
    const { toJSON } = render(<AppIcon />);
    const tree = toJSON() as Record<string, unknown>;
    expect(
      (tree.props as { style: { width: number; height: number } }).style,
    ).toMatchObject({
      width: 100,
      height: 100,
    });
  });

  test("renders with custom size", () => {
    const { toJSON } = render(<AppIcon size={60} />);
    const tree = toJSON() as Record<string, unknown>;
    expect(
      (tree.props as { style: { width: number; height: number } }).style,
    ).toMatchObject({
      width: 60,
      height: 60,
    });
  });
});
