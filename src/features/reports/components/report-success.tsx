// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { useEffect, useEffectEvent } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

const AUTO_CLOSE_MS = 2000;

const THANKS_BY_REASON: Partial<Record<string, string>> = {
  feature_request: "Спасибо за идею, обязательно рассмотрим",
  other: "Обязательно прочитаем",
};

type Props = {
  queued: boolean;
  reasonCode: string;
  onDone: () => void;
};

export function ReportSuccess({ queued, reasonCode, onDone }: Props) {
  const colors = useColors();

  const closeAutomatically = useEffectEvent(onDone);

  let caption = THANKS_BY_REASON[reasonCode] ?? "Посмотрим и исправим";
  if (queued) caption = "Отправим, когда появится интернет";

  useEffect(() => {
    const timer = setTimeout(closeAutomatically, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="items-center gap-2 px-6 pb-4 pt-6">
      <SymbolView
        name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
        size={56}
        tintColor={colors.success}
      />
      <Text variant="heading">Спасибо!</Text>
      <Text variant="caption" className="text-center">
        {caption}
      </Text>
      <Button variant="outline" onPress={onDone} className="mt-4 self-stretch">
        Готово
      </Button>
    </View>
  );
}
