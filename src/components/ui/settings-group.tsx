// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { ReactNode } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  /** Spacing override for the group's outer container, e.g. "mt-0" for the first group on a screen. */
  className?: string;
  children: ReactNode;
};

export function SettingsGroup({ title, className, children }: Props) {
  return (
    <View className={cn("mt-6", className)}>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-fg">
        {title}
      </Text>
      <View className="overflow-hidden rounded-xl bg-surface px-4">{children}</View>
    </View>
  );
}
