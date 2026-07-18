// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { useAppSync, useSyncState } from "@/lib/sync";
import type { AppSyncDeps } from "@/lib/sync";

import { formatRelativeTimeRu } from "../format-relative-time-ru";

type DataGroupProps = {
  /** Test-only injection point, mirrors useAppSync's own deps parameter. */
  deps?: Partial<AppSyncDeps>;
};

export function DataGroup({ deps }: DataGroupProps) {
  const { lastSyncedAt } = useSyncState();
  const { status, retry } = useAppSync(deps);
  const [manuallyTriggered, setManuallyTriggered] = useState(false);

  const isSyncing = manuallyTriggered && status === "loading";
  const hasError = manuallyTriggered && (status === "error" || status === "offline");

  const handleSyncNow = () => {
    setManuallyTriggered(true);
    retry();
  };

  return (
    <>
      <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-muted-fg">
        Данные
      </Text>
      <View className="overflow-hidden rounded-xl bg-surface px-4">
        <View className="flex-row items-center gap-3 py-3">
          <View className="flex-1">
            <Text>Последняя синхронизация</Text>
            <Text variant="caption">{formatRelativeTimeRu(lastSyncedAt)}</Text>
          </View>
          <Button
            variant="outline"
            size="sm"
            onPress={handleSyncNow}
            disabled={isSyncing}
          >
            {isSyncing ? "Синхронизация…" : "Синхронизировать"}
          </Button>
        </View>
        {hasError && (
          <>
            <View className="h-px bg-border" />
            <View className="items-center gap-2 py-4">
              <StatusMessage variant="error">
                Не удалось синхронизировать. Проверьте подключение к интернету.
              </StatusMessage>
            </View>
          </>
        )}
      </View>
    </>
  );
}
