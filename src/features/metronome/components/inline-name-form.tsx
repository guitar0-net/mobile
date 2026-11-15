// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent } from "expo-precision-metronome";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { TextInput } from "@/components/ui/text-input";
import { useColors } from "@/lib/themes";
import { pluralRu } from "@/lib/utils";

import { PatternDots } from "./pattern-dots";

const MAX_NAME_LENGTH = 24;

type Props = {
  title: string;
  name: string;
  pattern: readonly BeatAccent[];
  onChangeName: (name: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function InlineNameForm({
  title,
  name,
  pattern,
  onChangeName,
  onCancel,
  onConfirm,
}: Props) {
  const colors = useColors();

  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        marginBottom: 24,
      }}
    >
      <Text
        style={{
          fontFamily: "Geist-SemiBold",
          fontSize: 15,
          color: colors.foreground,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text style={{ fontSize: 12, color: colors.mutedFg, marginBottom: 12 }}>
        Название
      </Text>
      <View style={{ position: "relative", marginBottom: 10 }}>
        <TextInput
          value={name}
          onChangeText={(t) => onChangeName(t.slice(0, MAX_NAME_LENGTH))}
          placeholder="Например: Вальс"
          returnKeyType="done"
          autoFocus
          onSubmitEditing={onConfirm}
          className="pr-12"
        />
        <Text
          style={{
            position: "absolute",
            right: 12,
            top: 0,
            bottom: 0,
            textAlignVertical: "center",
            fontSize: 12,
            color: colors.mutedFg,
          }}
        >
          {name.length}/{MAX_NAME_LENGTH}
        </Text>
      </View>

      {pattern.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <PatternDots pattern={pattern} />
          <Text style={{ fontSize: 12, color: colors.mutedFg }}>
            {pluralRu(pattern.length, "доля", "доли", "долей")}
          </Text>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button variant="outline" onPress={onCancel} className="flex-1">
          Отмена
        </Button>
        <Button
          onPress={onConfirm}
          disabled={!name.trim()}
          icon={{ ios: "checkmark", android: "check" }}
          className="flex-1"
        >
          Сохранить
        </Button>
      </View>
    </View>
  );
}
