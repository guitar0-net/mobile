// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { ThemeProvider } from "@/lib/themes";

import { TextSection } from "./text-section";

const SONG_TEXT = "**&nbsp;　　G　C**  \r\nМое сердце остановилось,  \r\n";

describe("TextSection", () => {
  it("lets a lyric line take the full width instead of shrinking to its measured width", () => {
    render(
      <ThemeProvider>
        <TextSection text={SONG_TEXT} />
      </ThemeProvider>,
    );

    const lyricBlock = outermostText(screen.getByText(/Мое сердце остановилось,/));

    expect(StyleSheet.flatten(lyricBlock.props.style)).toMatchObject({ width: "100%" });
  });
});

function outermostText(node: ReactTestInstance): ReactTestInstance {
  let current = node;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if ((parent.type as string) === "Text") current = parent;
  }
  return current;
}
