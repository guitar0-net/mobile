// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, Switch, View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";

type BaseProps = {
  icon: SymbolViewProps["name"];
  iconBgColor: string;
  label: string;
  sublabel?: string;
};

type NavRowProps = BaseProps & { type: "nav"; onPress?: () => void };
type ToggleRowProps = BaseProps & {
  type: "toggle";
  value: boolean;
  onChange: (value: boolean) => void;
};

type Props = NavRowProps | ToggleRowProps;

export function SettingsRow(props: Props) {
  const { icon, iconBgColor, label, sublabel } = props;
  const colors = useColors();

  const inner = (
    <View className="flex-row items-center gap-3 py-3">
      <View
        className="h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: iconBgColor }}
      >
        <SymbolView name={icon} size={18} tintColor="#FFFFFF" />
      </View>
      <View className="flex-1">
        <Text>{label}</Text>
        {sublabel !== undefined && <Text variant="caption">{sublabel}</Text>}
      </View>
      {props.type === "nav" && (
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right" }}
          size={16}
          tintColor={colors.mutedFg}
        />
      )}
      {props.type === "toggle" && (
        <Switch
          value={props.value}
          onValueChange={props.onChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          ios_backgroundColor={colors.border}
        />
      )}
    </View>
  );

  if (props.type === "nav") {
    return (
      <Pressable onPress={props.onPress} className="active:opacity-70">
        {inner}
      </Pressable>
    );
  }

  return <View>{inner}</View>;
}
