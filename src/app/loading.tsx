// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { LottieAnimation } from "@/components/ui/lottie-animation";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { hasPendingLegacyReview, importLegacyProgress } from "@/features/migration";
import { captureException } from "@/lib/analytics";
import { useAppSync } from "@/lib/sync";
import { useColors } from "@/lib/themes";

export default function LoadingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { status, failure, progress, isFirstLaunch, retry } = useAppSync();

  useEffect(() => {
    if (status !== "success" && status !== "stale") return;

    let cancelled = false;
    const t = setTimeout(
      () => {
        void (async () => {
          let needsReview = false;
          try {
            await importLegacyProgress();
            needsReview = hasPendingLegacyReview();
          } catch (error) {
            // A failed migration must never leave the user on the splash
            // screen, which has no way out of this state.
            captureException(error, { stage: "legacy_import" });
          }
          if (cancelled) return;
          router.replace(needsReview ? "/migration" : "/(tabs)/home");
        })();
      },
      status === "success" ? 1000 : 1500,
    );

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [status, router]);

  let progressLabel = "Подключаемся к серверу...";
  if (progress?.stage === "fetching") {
    progressLabel = `Загружаем уроки... ${formatSize(progress.bytes)}`;
  } else if (progress?.stage === "saving") {
    progressLabel = "Сохраняем уроки...";
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 items-center px-8">
        <View className="w-full flex-1 items-center justify-end gap-3 pb-5">
          <LottieAnimation
            source={require("@/assets/animations/download.lottie")}
            size={120}
          />
          <Text
            variant="logo"
            className="w-full text-center"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Гитара с нуля
          </Text>
        </View>

        <View className="w-full flex-1 items-center gap-3 pt-5">
          {status === "loading" && isFirstLaunch && (
            <>
              <View className="h-8 w-full justify-center">
                <ProgressBar />
              </View>
              <Text className="text-sm text-muted-fg">{progressLabel}</Text>
            </>
          )}

          {status === "loading" && !isFirstLaunch && (
            <>
              <View className="h-8 justify-center">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
              <Text className="text-sm text-muted-fg">Синхронизация...</Text>
            </>
          )}

          {status === "success" && (
            <StatusMessage variant="success">Синхронизировано</StatusMessage>
          )}

          {status === "stale" && failure !== null && (
            <StatusMessage
              variant="warning"
              icon={
                failure.kind === "offline"
                  ? { ios: "wifi.slash", android: "wifi_off" }
                  : undefined
              }
            >
              {failure.label}
            </StatusMessage>
          )}

          {status === "error" && failure !== null && (
            <>
              <StatusMessage variant="error">
                Не удалось загрузить данные.{"\n"}
                {`${failure.reason}.`}
              </StatusMessage>
              <Button variant="ghost" size="sm" onPress={retry}>
                Повторить
              </Button>
            </>
          )}
        </View>

        <Text className="pb-2 text-xs text-muted-fg">
          v{Constants.expoConfig?.version}
        </Text>
      </SafeAreaView>
    </View>
  );
}

function formatSize(bytes: number): string {
  const kilobytes = Math.round(bytes / 1024);
  if (kilobytes < 1000) return `${kilobytes} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}
