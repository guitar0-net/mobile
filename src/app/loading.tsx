// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/app-icon";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { useAppSync } from "@/lib/sync";
import { useColors } from "@/lib/themes";

export default function LoadingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { status, progress, isFirstLaunch, retry } = useAppSync();

  useEffect(() => {
    if (status === "success") {
      const t = setTimeout(() => router.replace("/(tabs)/home"), 1000);
      return () => clearTimeout(t);
    }
    if (status === "offline") {
      const t = setTimeout(() => router.replace("/(tabs)/home"), 1500);
      return () => clearTimeout(t);
    }
  }, [status, router]);
  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center px-8">
        <View className="w-full flex-1 items-center justify-center gap-10">
          <View className="items-center gap-3">
            <AppIcon />
            <Text variant="logo" className="text-4xl text-primary">
              Гитара с нуля
            </Text>
          </View>

          <View className="w-full items-center gap-3">
            {status === "loading" && isFirstLaunch && (
              <>
                <View className="h-1.5 w-full overflow-hidden rounded-full border border-border">
                  <View
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${percentage}%` }}
                  />
                </View>
                <Text className="text-sm text-muted-fg">
                  {progress
                    ? `Загружаем уроки... ${percentage}%`
                    : "Загружаем уроки..."}
                </Text>
              </>
            )}

            {status === "loading" && !isFirstLaunch && (
              <>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text className="text-sm text-muted-fg">Синхронизация...</Text>
              </>
            )}

            {status === "success" && (
              <StatusMessage variant="success">Синхронизировано</StatusMessage>
            )}

            {status === "offline" && (
              <StatusMessage
                variant="warning"
                icon={{ ios: "wifi.slash", android: "wifi_off" }}
              >
                Нет соединения
              </StatusMessage>
            )}

            {status === "error" && (
              <>
                <StatusMessage variant="error">
                  Не удалось загрузить данные.{"\n"}Проверьте подключение к интернету
                  или попробуйте позже.
                </StatusMessage>
                <Button variant="ghost" size="sm" onPress={retry}>
                  Повторить
                </Button>
              </>
            )}
          </View>
        </View>

        <Text className="pb-2 text-xs text-muted-fg">
          v{Constants.expoConfig?.version}
        </Text>
      </SafeAreaView>
    </View>
  );
}
