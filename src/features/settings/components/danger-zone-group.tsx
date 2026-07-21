// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Alert, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { resetActivity } from "@/features/activity";
import { deleteAllDownloadedVideos } from "@/features/lessons";
import { useColors } from "@/lib/themes";

import { resetProgress } from "../store";

function confirmDeleteAllDownloadedVideos() {
  Alert.alert(
    "Удалить все загрузки",
    "Все загруженные видео уроков будут удалены с устройства. Их можно будет загрузить снова.",
    [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => void deleteAllDownloadedVideos(),
      },
    ],
  );
}

function performProgressReset() {
  resetProgress();
  void resetActivity();
}

// Second confirmation uses distinct copy and a swapped button order relative
// to the first, so a reflexive tap in the same screen position as the first
// dialog's confirm button lands on "Отмена" instead of confirming the reset.
function confirmResetIrreversibly() {
  Alert.alert(
    "Это действие нельзя отменить",
    "После сброса прогресс, избранное и историю активности восстановить не получится.",
    [
      { text: "Сбросить всё", style: "destructive", onPress: performProgressReset },
      { text: "Отмена", style: "cancel" },
    ],
  );
}

function confirmResetProgress() {
  Alert.alert(
    "Сбросить весь прогресс",
    "Будут удалены избранное, отметки о просмотре видео и завершённых песен, а также история активности.",
    [
      { text: "Отмена", style: "cancel" },
      { text: "Продолжить", style: "destructive", onPress: confirmResetIrreversibly },
    ],
  );
}

export function DangerZoneGroup() {
  const colors = useColors();

  return (
    <>
      <Text
        className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest"
        style={{ color: colors.destructive }}
      >
        Опасная зона
      </Text>
      <View
        className="gap-2 overflow-hidden rounded-xl border px-4 py-4"
        style={{
          borderColor: colors.destructive,
          backgroundColor: `${colors.destructive}1A`,
        }}
      >
        <Button
          variant="danger"
          onPress={confirmDeleteAllDownloadedVideos}
          className="rounded-xl"
        >
          Удалить все загруженные видео
        </Button>
        <Button variant="danger" onPress={confirmResetProgress} className="rounded-xl">
          Сбросить весь прогресс
        </Button>
      </View>
    </>
  );
}
