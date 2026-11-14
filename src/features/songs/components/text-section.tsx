// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Platform, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { Button } from "@/components/ui/button";
import { useFontSize, type FontSize } from "@/features/settings";
import { useColors } from "@/lib/themes";

import { SectionHeader } from "./section-header";

const FONT_SIZES: Record<FontSize, number> = {
  1: 13,
  2: 15,
  3: 17,
  4: 19,
  5: 22,
};

const LINE_HEIGHTS: Record<FontSize, number> = {
  1: 18,
  2: 21,
  3: 25,
  4: 29,
  5: 34,
};

type TextSectionProps = {
  text: string;
};

export function TextSection({ text }: TextSectionProps) {
  const colors = useColors();
  const { fontSize, setFontSize } = useFontSize();
  const fontSizeValue = FONT_SIZES[fontSize];
  const lineHeightValue = LINE_HEIGHTS[fontSize];

  const headingStyle = {
    color: colors.foreground,
    fontFamily: "Geist-SemiBold",
    fontSize: fontSizeValue,
    lineHeight: lineHeightValue,
  };
  const destructiveHeadingStyle = {
    color: colors.destructive,
    fontFamily: "Geist-SemiBold",
    fontSize: fontSizeValue,
    lineHeight: lineHeightValue,
  };
  const markdownStyles = {
    body: {
      color: colors.foreground,
      fontSize: fontSizeValue,
      lineHeight: lineHeightValue,
    },
    // Android can draw text wider than measured; a shrink-to-fit Text then clips its last word.
    textgroup: { width: "100%" as const },
    heading1: headingStyle,
    heading2: headingStyle,
    heading3: headingStyle,
    heading4: destructiveHeadingStyle,
    heading5: destructiveHeadingStyle,
    heading6: {
      backgroundColor: colors.surface,
      color: colors.mutedFg,
      borderRadius: 4,
      padding: 4,
      fontFamily: "Geist-SemiBold",
      fontSize: fontSizeValue,
      lineHeight: lineHeightValue,
    },
    code_inline: {
      backgroundColor: colors.surface,
      color: colors.foreground,
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    },
    fence: {
      backgroundColor: colors.surface,
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    },
    blockquote: { backgroundColor: colors.surface },
    link: { color: colors.primary },
  };

  return (
    <View>
      <SectionHeader title="Текст">
        <Button
          size="icon-sm"
          variant="ghost"
          icon={{ ios: "minus", android: "remove" }}
          onPress={() => setFontSize((fontSize - 1) as FontSize)}
          disabled={fontSize === 1}
        />
        <Button
          size="icon-sm"
          variant="ghost"
          icon={{ ios: "plus", android: "add" }}
          onPress={() => setFontSize((fontSize + 1) as FontSize)}
          disabled={fontSize === 5}
        />
      </SectionHeader>
      <Markdown style={markdownStyles}>{text}</Markdown>
    </View>
  );
}
