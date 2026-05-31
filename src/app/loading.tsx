// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@/components/ui/text";
import { useAppSync } from "@/lib/sync";
import { useTheme } from "@/lib/themes";
import { THEME_DEFINITIONS } from "@/lib/themes/definitions";

export default function LoadingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
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

  const primaryColor = THEME_DEFINITIONS[theme]["--color-primary"];
  const percentage =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center justify-center gap-10 px-8">
        <View className="items-center gap-3">
          <Image
            source={require("../../assets/images/splash-icon.png")}
            style={{ width: 100, height: 100 }}
            resizeMode="contain"
          />
          <Text variant="logo" className="text-4xl text-primary">
            Гитара с нуля
          </Text>
        </View>

        <View className="w-full items-center gap-3">
          {status === "loading" && isFirstLaunch && (
            <>
              <View className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percentage}%` }}
                />
              </View>
              <Text className="text-sm text-muted-fg">
                {progress ? `Загружаем уроки... ${percentage}%` : "Загружаем уроки..."}
              </Text>
            </>
          )}

          {status === "loading" && !isFirstLaunch && (
            <>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text className="text-sm text-muted-fg">Синхронизация...</Text>
            </>
          )}

          {status === "success" && (
            <>
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
                size={32}
                tintColor="#22C55E"
              />
              <Text className="text-sm text-muted-fg">Синхронизировано</Text>
            </>
          )}

          {status === "offline" && (
            <>
              <SymbolView
                name={{ ios: "wifi.slash", android: "wifi_off" }}
                size={32}
                tintColor="#F59E0B"
              />
              <Text className="text-center text-sm text-muted-fg">
                Нет соединения — работаем офлайн
              </Text>
            </>
          )}

          {status === "error" && (
            <>
              <SymbolView
                name={{ ios: "exclamationmark.triangle.fill", android: "error" }}
                size={32}
                tintColor="#EF4444"
              />
              <Text className="text-center text-sm text-muted-fg">
                Не удалось загрузить данные.{"\n"}Проверьте подключение к интернету.
              </Text>
              <Pressable onPress={retry} className="mt-1">
                <Text className="font-semibold text-primary">Повторить</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
