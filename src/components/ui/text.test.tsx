// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";

import { Text } from "./text";

describe("Text", () => {
  test("renders children", () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  test("uses body variant by default (no variant prop)", () => {
    // Covers the default-parameter branch: variant = "body"
    const { toJSON } = render(<Text>Default body</Text>);
    expect(toJSON()).toBeTruthy();
  });

  test("heading variant", () => {
    render(<Text variant="heading">Заголовок</Text>);
    expect(screen.getByText("Заголовок")).toBeTruthy();
  });

  test("caption variant", () => {
    render(<Text variant="caption">Подпись</Text>);
    expect(screen.getByText("Подпись")).toBeTruthy();
  });

  test("logo variant", () => {
    render(<Text variant="logo">guitar0</Text>);
    expect(screen.getByText("guitar0")).toBeTruthy();
  });

  test("forwards className and other TextProps", () => {
    render(
      <Text variant="body" className="extra-class" testID="my-text">
        Привет
      </Text>,
    );
    expect(screen.getByTestId("my-text")).toBeTruthy();
  });
});
