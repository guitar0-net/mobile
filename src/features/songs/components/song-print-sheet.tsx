// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useMutation } from "@tanstack/react-query";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet, SheetScrollView } from "@/components/ui/sheet";
import { StatusMessage } from "@/components/ui/status-message";
import { Text } from "@/components/ui/text";
import { Toggle } from "@/components/ui/toggle";

import {
  usePrintSettingsStore,
  type ChordOrientation,
  type Size,
} from "../print-settings-store";
import { printSong } from "../print-song";

const SIZE_OPTIONS: { label: string; value: Size }[] = [
  { label: "80%", value: 1 },
  { label: "90%", value: 2 },
  { label: "100%", value: 3 },
  { label: "120%", value: 4 },
  { label: "140%", value: 5 },
];

const ORIENTATION_OPTIONS: { label: string; value: ChordOrientation }[] = [
  { label: "Вертикальная", value: "vertical" },
  { label: "Горизонтальная", value: "horizontal" },
];

const COLUMNS_OPTIONS: { label: string; value: 1 | 2 | 3 }[] = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  songUuid: string;
  hasChords: boolean;
  hasSchemes: boolean;
};

export function SongPrintSheet({
  visible,
  onClose,
  songUuid,
  hasChords,
  hasSchemes,
}: Props) {
  const {
    showChords,
    showSchemes,
    showText,
    chordOrientation,
    chordSize,
    schemeSize,
    textSize,
    columnsCount,
    setShowChords,
    setShowSchemes,
    setShowText,
    setChordOrientation,
    setChordSize,
    setSchemeSize,
    setTextSize,
    setColumnsCount,
  } = usePrintSettingsStore();

  const { mutate, isPending, error, reset } = useMutation({
    mutationFn: () =>
      printSong(songUuid, {
        showChords,
        showSchemes,
        showText,
        chordOrientation,
        chordSize,
        schemeSize,
        textSize,
        columnsCount,
      }),
    onSuccess: onClose,
  });

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={handleClose} size="large">
      <View className="px-5 pb-2 pt-4">
        <Text variant="heading" className="text-lg">
          Печать
        </Text>
      </View>
      <SheetScrollView>
        <View className="px-5 pb-8">
          <View className="mb-4">
            <SettingRow
              label="Аккорды"
              control={
                hasChords ? (
                  <Toggle value={showChords} onValueChange={setShowChords} />
                ) : (
                  <Text variant="caption">Нет аккордов</Text>
                )
              }
            />
            {hasChords && showChords && (
              <View className="mt-2 gap-2">
                <SegmentedControl
                  options={ORIENTATION_OPTIONS}
                  value={chordOrientation}
                  onChange={setChordOrientation}
                />
                <SegmentedControl
                  options={SIZE_OPTIONS}
                  value={chordSize}
                  onChange={setChordSize}
                />
              </View>
            )}
          </View>

          <View className="mb-4">
            <SettingRow
              label="Схемы"
              control={
                hasSchemes ? (
                  <Toggle value={showSchemes} onValueChange={setShowSchemes} />
                ) : (
                  <Text variant="caption">Нет схем</Text>
                )
              }
            />
            {hasSchemes && showSchemes && (
              <View className="mt-2">
                <SegmentedControl
                  options={SIZE_OPTIONS}
                  value={schemeSize}
                  onChange={setSchemeSize}
                />
              </View>
            )}
          </View>

          <View className="mb-4">
            <SettingRow
              label="Текст"
              control={<Toggle value={showText} onValueChange={setShowText} />}
            />
            {showText && (
              <View className="mt-2">
                <SegmentedControl
                  options={SIZE_OPTIONS}
                  value={textSize}
                  onChange={setTextSize}
                />
              </View>
            )}
          </View>

          <View className="mb-6">
            <Text className="mb-2 font-sans-semibold">Колонок на странице</Text>
            <SegmentedControl
              options={COLUMNS_OPTIONS}
              value={columnsCount}
              onChange={setColumnsCount}
            />
          </View>

          {error && (
            <View className="mb-4 items-center">
              <StatusMessage variant="error">Не удалось создать PDF.</StatusMessage>
            </View>
          )}

          <Button onPress={() => mutate()} disabled={isPending}>
            {isPending ? "Генерация PDF..." : "Получить PDF"}
          </Button>
        </View>
      </SheetScrollView>
    </Sheet>
  );
}

function SettingRow({ label, control }: { label: string; control: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-sans-semibold">{label}</Text>
      {control}
    </View>
  );
}
