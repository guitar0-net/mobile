// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { render, screen, within } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { ReactTestInstance } from "react-test-renderer";

import { ThemeProvider } from "@/lib/themes";

import { TextSection } from "./text-section";

const SONG_TEXT = "**&nbsp;　　G　C**  \r\nМое сердце остановилось,  \r\n";

describe("TextSection", () => {
  it("lets a lyric line take the full width instead of shrinking to its measured width", () => {
    renderSection({ text: SONG_TEXT });

    const lyricBlock = outermostText(screen.getByText(/Мое сердце остановилось,/));

    expect(StyleSheet.flatten(lyricBlock.props.style)).toMatchObject({ width: "100%" });
  });

  it("renders a chord in the same word as the syllable it belongs to", () => {
    renderSection({ chordText: "Мы не [G (2)]знали друг друга  " });

    const word = enclosingWord(screen.getByText("G (2)"));

    expect(within(word).getByText(/знали/)).toBeTruthy();
  });

  it("keeps a word with an inner chord together with both of its chords", () => {
    renderSection({ chordText: "[Am]Холод[G]ный ветер" });

    const word = enclosingWord(screen.getByText("Am"));

    expect(within(word).getByText("G")).toBeTruthy();
    expect(within(word).getByText("Холод")).toBeTruthy();
    expect(within(word).getByText(/ный/)).toBeTruthy();
    expect(within(word).queryByText(/ветер/)).toBeNull();
  });

  it("shows a chord that comes after the last word of a line", () => {
    renderSection({ chordText: "Выхо[C (2)]да нет [D(2)]  " });

    expect(screen.getByText("D(2)")).toBeTruthy();
    expect(enclosingWord(screen.getByText("D(2)"))).not.toBe(
      enclosingWord(screen.getByText(/нет/)),
    );
  });

  it("never shows chord brackets as text or as a link", () => {
    renderSection({
      chordText:
        "**Вступление: Am G**  \r\n\r\n[Am]Холодный [G]ветер с дождем [F]уси[E]лился  \r\n",
    });

    expect(screen.queryByText(/[[\]]/)).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows the plain text when the song has no chord text", () => {
    renderSection({
      text: "**Am G**  \r\nМое сердце остановилось,  \r\n",
      chordText: "",
    });

    expect(screen.getByText(/Мое сердце остановилось,/)).toBeTruthy();
    expect(screen.queryByTestId("chord-word")).toBeNull();
  });

  it("shows the chord text instead of the plain text when both exist", () => {
    renderSection({
      text: "Мое сердце остановилось,",
      chordText: "[Am]Мое сердце остановилось,",
    });

    expect(screen.getAllByText(/сердце/)).toHaveLength(1);
    expect(screen.getByText("Am")).toBeTruthy();
  });

  it.each(["#### Играем боем", "###### Куплет № 1", "**Проигрыш: Am G F E**"])(
    "styles %j in chord text the same as in plain text",
    (markdownLine) => {
      const label = markdownLine.replace(/[#*]/g, "").trim();
      renderSection({ text: `${markdownLine}  \r\n\r\nЯ тосковал по тебе` });
      const plainStyle = StyleSheet.flatten(screen.getByText(label).props.style);
      screen.unmount();

      renderSection({
        chordText: `${markdownLine}  \r\n\r\n[Am]Я тоско[G]вал по тебе`,
      });

      expect(StyleSheet.flatten(screen.getByText(label).props.style)).toEqual(
        plainStyle,
      );
    },
  );
});

function renderSection({
  text = "",
  chordText = "",
}: {
  text?: string;
  chordText?: string;
}) {
  render(
    <ThemeProvider>
      <TextSection text={text} chordText={chordText} />
    </ThemeProvider>,
  );
}

function enclosingWord(node: ReactTestInstance): ReactTestInstance {
  for (
    let current: ReactTestInstance | null = node;
    current;
    current = current.parent
  ) {
    if (current.props.testID === "chord-word") return current;
  }
  throw new Error("node is not inside a chord word");
}

function outermostText(node: ReactTestInstance): ReactTestInstance {
  let current = node;
  for (let parent = node.parent; parent; parent = parent.parent) {
    if ((parent.type as string) === "Text") current = parent;
  }
  return current;
}
