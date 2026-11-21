// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

import { useOpenReport } from "../report-route";

type ContentTarget = { type: "song" | "lesson"; id: string };

const PROMPTS: Record<ContentTarget["type"], string> = {
  song: "Нашли ошибку в песне?",
  lesson: "Нашли ошибку в уроке?",
};

type Props = {
  target: ContentTarget;
};

export function ReportFooterLink({ target }: Props) {
  const openReport = useOpenReport();

  return (
    <View className="mt-8 flex-row items-center justify-center gap-1">
      <Text variant="caption">{PROMPTS[target.type]}</Text>
      <Button
        variant="link"
        size="sm"
        onPress={() =>
          openReport(target, target.type === "song" ? "song_footer" : "lesson_footer")
        }
      >
        Сообщить
      </Button>
    </View>
  );
}
