// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { count } from "drizzle-orm";
import { useEffect, useState } from "react";
import { DevSettings, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { getContentVersion, useCompletedLessonsCount } from "@/features/lessons";
import { resetLegacyImport } from "@/features/migration";
import { useFavorites, useThemePreference } from "@/features/settings";
import { chords, courses, getDb, lessons, schemes, songs } from "@/lib/db";
import {
  clearLegacyProgress,
  resetAllData,
  resetSyncState,
  seedLegacyProgress,
} from "@/lib/dev";
import { useTheme, type ThemeName } from "@/lib/themes";
import type { ThemeMode } from "@/lib/themes/resolve-theme";

type DbCounts = {
  courses: number;
  lessons: number;
  songs: number;
  chords: number;
  schemes: number;
};

const THEMES: {
  name: ThemeName;
  label: string;
  mode: ThemeMode;
  highContrast: boolean;
}[] = [
  { name: "light", label: "Light", mode: "light", highContrast: false },
  { name: "dark", label: "Dark", mode: "dark", highContrast: false },
  {
    name: "contrast-light",
    label: "Contrast Light",
    mode: "light",
    highContrast: true,
  },
  { name: "contrast-dark", label: "Contrast Dark", mode: "dark", highContrast: true },
];

export default function DevToolsScreen() {
  const { theme } = useTheme();
  const { setThemeMode, setHighContrast } = useThemePreference();
  const { favorites } = useFavorites();
  const completedLessons = useCompletedLessonsCount();
  const [counts, setCounts] = useState<DbCounts | null>(null);
  const [contentVersion, setContentVersion] = useState<string | null>(null);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const db = getDb();
        const [[c], [l], [s], [ch], [sc]] = await Promise.all([
          db.select({ n: count() }).from(courses),
          db.select({ n: count() }).from(lessons),
          db.select({ n: count() }).from(songs),
          db.select({ n: count() }).from(chords),
          db.select({ n: count() }).from(schemes),
        ]);
        setCounts({
          courses: c.n,
          lessons: l.n,
          songs: s.n,
          chords: ch.n,
          schemes: sc.n,
        });
        setContentVersion(getContentVersion(db));
      } catch {
        // DB not yet initialized
      }
    }
    void load();
  }, []);

  async function handleResetAll() {
    await resetAllData();
    DevSettings.reload();
  }

  function handleResetSync() {
    resetSyncState();
    DevSettings.reload();
  }

  function handleReplayLegacyImport() {
    resetLegacyImport();
    DevSettings.reload();
  }

  async function handleSeedLegacyProgress() {
    const { completed, favorites: favoriteCount } = await seedLegacyProgress();
    setSeedResult(
      `Записано в старом формате: ${completed} пройденных, ${favoriteCount} избранных. Текущий прогресс очищен.`,
    );
  }

  async function handleClearLegacyProgress() {
    await clearLegacyProgress();
    setSeedResult("Старый прогресс удалён.");
  }

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScreenScrollView
          bottomSafeArea={false}
          className="flex-1"
          contentContainerClassName="px-4 pt-4 pb-6 gap-6"
        >
          <Text className="text-2xl font-semibold">Dev Tools</Text>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              База данных
            </Text>
            <View className="overflow-hidden rounded-xl bg-surface">
              {[
                ["Курсы", counts?.courses],
                ["Уроки", counts?.lessons],
                ["Песни", counts?.songs],
                ["Аккорды", counts?.chords],
                ["Схемы", counts?.schemes],
              ].map(([label, value], i, arr) => (
                <View
                  key={label as string}
                  className={`flex-row justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Text className="text-foreground">{label as string}</Text>
                  <Text className="text-muted-fg">
                    {value != null ? String(value) : "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Синхронизация
            </Text>
            <View className="overflow-hidden rounded-xl bg-surface">
              <View className="flex-row justify-between px-4 py-3">
                <Text className="text-foreground">Версия контента</Text>
                <Text className="text-muted-fg">{contentVersion ?? "—"}</Text>
              </View>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Тема
            </Text>
            <View className="overflow-hidden rounded-xl bg-surface">
              {THEMES.map(({ name, label, mode, highContrast }, i) => (
                <View
                  key={name}
                  className={`flex-row items-center justify-between px-4 py-3 ${i < THEMES.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Text className="text-foreground">{label}</Text>
                  {theme === name ? (
                    <Text className="text-sm font-medium text-primary">Активна</Text>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() => {
                        setThemeMode(mode);
                        setHighContrast(highContrast);
                      }}
                    >
                      Выбрать
                    </Button>
                  )}
                </View>
              ))}
            </View>
          </View>

          <View className="gap-3">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Миграция 4.x
            </Text>
            <View className="overflow-hidden rounded-xl bg-surface">
              {[
                ["Пройдено уроков", completedLessons],
                ["Избранных уроков", favorites.length],
              ].map(([label, value], i, arr) => (
                <View
                  key={label as string}
                  className={`flex-row justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Text className="text-foreground">{label as string}</Text>
                  <Text className="text-muted-fg">{String(value)}</Text>
                </View>
              ))}
            </View>
            {seedResult !== null && (
              <StatusMessage variant="success">{seedResult}</StatusMessage>
            )}
            <Button variant="outline" onPress={() => void handleSeedLegacyProgress()}>
              Подложить прогресс 4.x
            </Button>
            <Button variant="ghost" onPress={handleReplayLegacyImport}>
              Запустить импорт
            </Button>
            <Button variant="ghost" onPress={() => void handleClearLegacyProgress()}>
              Удалить старый прогресс
            </Button>
          </View>

          <View className="gap-3">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Сброс
            </Text>
            <Button variant="outline" onPress={() => void handleResetAll()}>
              Сбросить всё
            </Button>
            <Button variant="ghost" onPress={handleResetSync}>
              Сбросить синк-стейт
            </Button>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    </View>
  );
}
