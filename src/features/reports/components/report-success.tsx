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

type Props = {
  queued: boolean;
  onDone: () => void;
};

export function ReportSuccess({ queued, onDone }: Props) {
  const colors = useColors();

  const closeAutomatically = useEffectEvent(onDone);

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
        {queued ? "Отправим, когда появится интернет" : "Посмотрим и исправим"}
      </Text>
      <Button variant="outline" onPress={onDone} className="mt-4 self-stretch">
        Готово
      </Button>
    </View>
  );
}
