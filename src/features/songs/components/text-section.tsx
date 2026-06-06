// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Platform } from "react-native";
import Markdown from "react-native-markdown-display";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

type TextSectionProps = {
  text: string;
};

export function TextSection({ text }: TextSectionProps) {
  const colors = useColors();
  const headingStyle = { color: colors.foreground, fontFamily: "Geist-SemiBold" };

  const destructiveHeadingStyle = {
    color: colors.destructive,
    fontFamily: "Geist-SemiBold",
  };
  const markdownStyles = {
    body: { color: colors.foreground, fontSize: 16, lineHeight: 24 },
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
      fontSize: 16,
      lineHeight: 24,
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
    <>
      <Text variant="heading">Текст</Text>
      <Markdown style={markdownStyles}>{text}</Markdown>
    </>
  );
}
