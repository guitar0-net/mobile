// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Text } from "@/components/ui/text";

type SectionHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <View className="mb-2 flex-row items-center">
      <Text variant="heading" className="flex-1">
        {title}
      </Text>
      {children && <View className="flex-row items-center">{children}</View>}
    </View>
  );
}
