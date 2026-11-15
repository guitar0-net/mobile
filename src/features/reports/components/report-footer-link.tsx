// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { ReportSheet } from "./report-sheet";

type ContentTarget = { type: "song" | "lesson"; id: string };

const PROMPTS: Record<ContentTarget["type"], string> = {
  song: "Нашли ошибку в песне?",
  lesson: "Нашли ошибку в уроке?",
};

type Props = {
  target: ContentTarget;
};

export function ReportFooterLink({ target }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View className="mt-8 flex-row items-center justify-center gap-1">
      <Text variant="caption">{PROMPTS[target.type]}</Text>
      <Button variant="link" size="sm" onPress={() => setOpen(true)}>
        Сообщить
      </Button>
      <ReportSheet
        visible={open}
        onClose={() => setOpen(false)}
        target={target}
        source={target.type === "song" ? "song_footer" : "lesson_footer"}
      />
    </View>
  );
}
