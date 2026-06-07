// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Platform, View } from "react-native";
import Markdown from "react-native-markdown-display";

import { useFontSize, type FontSize } from "@/features/settings";
import { useColors } from "@/lib/themes";

import { ControlButton, SectionHeader } from "./section-header";

const FONT_SIZES: Record<FontSize, number> = {
  1: 13,
  2: 15,
  3: 17,
  4: 19,
  5: 22,
};

type TextSectionProps = {
  text: string;
};

export function TextSection({ text }: TextSectionProps) {
  const colors = useColors();
  const { fontSize, setFontSize } = useFontSize();
  const fontSizeValue = FONT_SIZES[fontSize];

  const headingStyle = { color: colors.foreground, fontFamily: "Geist-SemiBold" };
  const destructiveHeadingStyle = {
    color: colors.destructive,
    fontFamily: "Geist-SemiBold",
  };
  const markdownStyles = {
    body: {
      color: colors.foreground,
      fontSize: fontSizeValue,
      lineHeight: fontSizeValue * 1.5,
    },
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
      lineHeight: fontSizeValue * 1.5,
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
        <ControlButton
          icon={{ ios: "minus", android: "remove" }}
          onPress={() => setFontSize((fontSize - 1) as FontSize)}
          disabled={fontSize === 1}
        />
        <ControlButton
          icon={{ ios: "plus", android: "add" }}
          onPress={() => setFontSize((fontSize + 1) as FontSize)}
          disabled={fontSize === 5}
        />
      </SectionHeader>
      <Markdown style={markdownStyles}>{text}</Markdown>
    </View>
  );
}
