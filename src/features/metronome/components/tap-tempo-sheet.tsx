// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { pluralRu } from "@/lib/utils";

import { useTapTempo } from "../use-tap-tempo";

type Props = {
  visible: boolean;
  onClose: () => void;
  onBpmChange: (bpm: number) => void;
};

export function TapTempoSheet({ visible, onClose, onBpmChange }: Props) {
  const { tap, reset, tapCount, tapBpm } = useTapTempo(onBpmChange);

  const handleClose = () => {
    reset();
    onClose();
  };

  const tapCountLabel = pluralRu(tapCount, "нажатие", "нажатия", "нажатий");

  return (
    <Sheet visible={visible} onClose={handleClose} size="auto">
      <View className="px-4 pb-10 pt-2">
        <View className="mb-6 flex-row items-center justify-between">
          <Text variant="heading">Тап темп</Text>
          <Button variant="ghost" size="sm" onPress={reset}>
            Сбросить
          </Button>
        </View>
        <Pressable
          onPress={tap}
          className="mb-4 h-44 items-center justify-center rounded-2xl bg-background active:bg-surface"
        >
          {tapCount === 0 && (
            <Text className="text-center text-muted-fg">Нажимай в такт музыке</Text>
          )}
          {tapCount === 1 && (
            <Text className="text-center text-muted-fg">Ещё раз...</Text>
          )}
          {tapCount >= 2 && tapBpm !== null && (
            <>
              <Text className="font-sans-semibold text-6xl text-foreground">
                {tapBpm}
              </Text>
              <Text variant="caption" className="mt-1">
                BPM
              </Text>
            </>
          )}
        </Pressable>
        <Text className="mb-4 text-center text-sm text-muted-fg">{tapCountLabel}</Text>
        <Button onPress={handleClose}>
          {tapBpm !== null ? `Применить ${tapBpm} BPM` : "Закрыть"}
        </Button>
      </View>
    </Sheet>
  );
}
