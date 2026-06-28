// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SOUND_PRESETS, type SoundPreset } from "expo-precision-metronome";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";

import { Sheet } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

import { SOUND_LABELS } from "../presets";

type Props = {
  visible: boolean;
  currentPreset: SoundPreset;
  onClose: () => void;
  onSelect: (preset: SoundPreset) => void;
};

export function SoundSheet({ visible, currentPreset, onClose, onSelect }: Props) {
  const colors = useColors();

  return (
    <Sheet visible={visible} onClose={onClose} size="auto">
      <View className="px-4 pb-10 pt-2">
        <Text variant="heading" className="mb-4">
          Звук
        </Text>
        <View
          style={{
            borderRadius: 14,
            backgroundColor: colors.background,
            overflow: "hidden",
          }}
        >
          {SOUND_PRESETS.map((preset, i) => {
            const isSelected = preset === currentPreset;
            return (
              <View key={preset}>
                {i > 0 && (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.border,
                      marginLeft: 16,
                    }}
                  />
                )}
                <Pressable
                  onPress={() => {
                    onSelect(preset);
                    onClose();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                  }}
                >
                  <Text
                    className={
                      isSelected ? "font-sans-semibold text-primary" : undefined
                    }
                  >
                    {SOUND_LABELS[preset]}
                  </Text>
                  {isSelected && (
                    <SymbolView
                      name={{ ios: "checkmark", android: "check" }}
                      size={16}
                      tintColor={colors.primary}
                    />
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}
