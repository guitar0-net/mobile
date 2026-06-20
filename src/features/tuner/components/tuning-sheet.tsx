// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { TUNINGS, type Tuning } from "@/features/tuner/tunings";
import { useColors } from "@/lib/themes";

type Props = {
  visible: boolean;
  currentTuningId: string;
  onClose: () => void;
  onSelect: (tuning: Tuning) => void;
};

export function TuningSheet({ visible, currentTuningId, onClose, onSelect }: Props) {
  const colors = useColors();

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View className="px-4 pb-2 pt-4">
        <Text variant="heading" className="mb-4 text-lg">
          Строй
        </Text>
        {TUNINGS.map((tuning) => {
          const isSelected = tuning.id === currentTuningId;
          return (
            <Pressable
              key={tuning.id}
              onPress={() => {
                onSelect(tuning);
                onClose();
              }}
              className="flex-row items-center gap-3 py-3 active:opacity-70"
            >
              <View className="flex-1">
                <Text className="font-sans-semibold">{tuning.label}</Text>
                <Text variant="caption">{tuning.shortLabel}</Text>
              </View>
              {isSelected && (
                <SymbolView
                  name={{ ios: "checkmark", android: "check" }}
                  size={18}
                  tintColor={colors.primary}
                />
              )}
            </Pressable>
          );
        })}
        <View className="h-4" />
      </View>
    </Sheet>
  );
}
