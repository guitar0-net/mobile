// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { BeatAccent } from "expo-precision-metronome";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { CloseButton } from "@/components/ui/close-button";
import { Sheet, SheetScrollView } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { cn, pluralRu, withAlpha } from "@/lib/utils";

import { patternsEqual, PRESET_SIZES } from "../presets";
import type { SavedPattern } from "../store";
import { BeatIndicator } from "./beat-indicator";
import { InlineNameForm } from "./inline-name-form";
import { PatternDots } from "./pattern-dots";

const MAX_BEATS = 16;

type InlineForm =
  | { type: "save"; name: string }
  | { type: "rename"; index: number; name: string }
  | null;

type Props = {
  visible: boolean;
  currentPattern: BeatAccent[];
  savedPatterns: SavedPattern[];
  onClose: () => void;
  onApplyPattern: (pattern: BeatAccent[]) => void;
  onSavePattern: (name: string) => void;
  onDeletePattern: (index: number) => void;
  onRenamePattern: (index: number, name: string) => void;
};

export function TimeSignatureSheet({
  visible,
  currentPattern,
  savedPatterns,
  onClose,
  onApplyPattern,
  onSavePattern,
  onDeletePattern,
  onRenamePattern,
}: Props) {
  const colors = useColors();
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [customPattern, setCustomPattern] = useState<BeatAccent[]>(currentPattern);
  const [inlineForm, setInlineForm] = useState<InlineForm>(null);
  const prevVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      setCustomPattern(currentPattern);
      const idx = PRESET_SIZES.findIndex((p) =>
        patternsEqual(p.pattern, currentPattern),
      );
      setSelectedPreset(idx >= 0 ? idx : null);
      setInlineForm(null);
    }
    prevVisibleRef.current = visible;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot currentPattern only on open
  }, [visible]);

  const handlePresetTap = (index: number) => {
    onApplyPattern(PRESET_SIZES[index].pattern);
    onClose();
  };

  const handleCustomPatternChange = (pattern: BeatAccent[]) => {
    setCustomPattern(pattern);
    setSelectedPreset(null);
    onApplyPattern(pattern);
  };

  const handleBeatCountChange = (delta: number) => {
    const newLen = Math.max(1, Math.min(MAX_BEATS, customPattern.length + delta));
    if (newLen === customPattern.length) return;
    const newPattern: BeatAccent[] =
      newLen < customPattern.length
        ? customPattern.slice(0, newLen)
        : [
            ...customPattern,
            ...Array<BeatAccent>(newLen - customPattern.length).fill("normal"),
          ];
    handleCustomPatternChange(newPattern);
  };

  const handleSave = () => {
    if (inlineForm?.type !== "save") return;
    const name = inlineForm.name.trim();
    if (!name) return;
    onSavePattern(name);
    setInlineForm(null);
  };

  const handleRename = () => {
    if (inlineForm?.type !== "rename") return;
    const name = inlineForm.name.trim();
    if (!name) return;
    onRenamePattern(inlineForm.index, name);
    setInlineForm(null);
  };

  const handleKebab = (index: number) => {
    Alert.alert(savedPatterns[index].name, undefined, [
      {
        text: "Переименовать",
        onPress: () =>
          setInlineForm({ type: "rename", index, name: savedPatterns[index].name }),
      },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => onDeletePattern(index),
      },
      { text: "Отмена", style: "cancel" },
    ]);
  };

  const isCustomActive = selectedPreset === null;

  return (
    <Sheet visible={visible} onClose={onClose} size="large">
      <>
        <View className="flex-row items-center justify-between px-4 pb-3 pt-2">
          <View className="flex-row items-center gap-2">
            <SymbolView
              name={{ ios: "metronome", android: "music_note" }}
              size={18}
              tintColor={colors.primary}
            />
            <View>
              <Text className="font-sans-semibold text-base text-foreground">
                Размер
              </Text>
              <Text className="text-xs text-muted-fg">Доли и акценты метронома</Text>
            </View>
          </View>
          <CloseButton onPress={onClose} />
        </View>

        <SheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="mb-3 text-xs uppercase tracking-widest text-muted-fg">
            Готовые размеры
          </Text>
          <View className="mb-6 flex-row flex-wrap gap-2">
            {PRESET_SIZES.map((preset, i) => (
              <PresetCard
                key={preset.label}
                label={preset.label}
                pattern={preset.pattern}
                selected={selectedPreset === i}
                onPress={() => handlePresetTap(i)}
              />
            ))}
          </View>

          <View
            className={cn(
              "mb-4 rounded-2xl p-3",
              isCustomActive ? "border-[1.5px] border-primary" : "border border-border",
            )}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text
                className={cn(
                  "font-sans-semibold text-[13px] uppercase",
                  isCustomActive ? "text-primary" : "text-muted-fg",
                )}
                style={{ letterSpacing: 1 }}
              >
                Свой размер
              </Text>
              <View className="flex-row items-center gap-1">
                <Pressable
                  onPress={() => handleBeatCountChange(-1)}
                  disabled={customPattern.length <= 1}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: colors.background,
                    opacity: customPattern.length <= 1 ? 0.3 : 1,
                  }}
                >
                  <SymbolView
                    name={{ ios: "minus", android: "remove" }}
                    size={14}
                    tintColor={colors.foreground}
                  />
                </Pressable>
                <Text className="min-w-[60px] text-center font-sans-semibold text-[13px] text-foreground">
                  {pluralRu(customPattern.length, "доля", "доли", "долей")}
                </Text>
                <Pressable
                  onPress={() => handleBeatCountChange(1)}
                  disabled={customPattern.length >= MAX_BEATS}
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: colors.primary,
                    opacity: customPattern.length >= MAX_BEATS ? 0.3 : 1,
                  }}
                >
                  <SymbolView
                    name={{ ios: "plus", android: "add" }}
                    size={14}
                    tintColor={colors.primaryFg}
                  />
                </Pressable>
              </View>
            </View>

            <BeatIndicator
              pattern={customPattern}
              currentBeat={-1}
              onPatternChange={handleCustomPatternChange}
            />

            <View className="mb-1.5 mt-2.5 flex-row gap-3">
              <LegendDot color={colors.primary} label="Акцент" />
              <LegendDot color={withAlpha(colors.primary, 0.45)} label="Обычная" />
              <LegendDot
                color={withAlpha(colors.mutedFg, 0.15)}
                border={withAlpha(colors.mutedFg, 0.5)}
                label="Без звука"
              />
            </View>

            <Text className="text-xs text-muted-fg">
              Нажми на долю — меняет акцент по кругу. Максимум{" "}
              {pluralRu(MAX_BEATS, "доля", "доли", "долей")}.
            </Text>
          </View>

          {inlineForm?.type === "save" ? (
            <InlineNameForm
              title="Сохранить размер"
              name={inlineForm.name}
              pattern={customPattern}
              onChangeName={(name) => setInlineForm({ type: "save", name })}
              onCancel={() => setInlineForm(null)}
              onConfirm={handleSave}
            />
          ) : (
            <Pressable
              onPress={() => setInlineForm({ type: "save", name: "" })}
              className="mb-6 h-12 flex-row items-center justify-center gap-2 rounded-[14px] border"
              style={{ borderColor: colors.border }}
            >
              <SymbolView
                name={{ ios: "bookmark", android: "bookmark" }}
                size={16}
                tintColor={colors.primary}
              />
              <Text className="font-sans-semibold text-[15px] text-primary">
                Сохранить размер…
              </Text>
            </Pressable>
          )}

          {savedPatterns.length > 0 && (
            <>
              <Text className="mb-3 text-xs uppercase tracking-widest text-muted-fg">
                Мои размеры
              </Text>

              {inlineForm?.type === "rename" && (
                <View className="mb-3">
                  <InlineNameForm
                    title="Переименовать"
                    name={inlineForm.name}
                    pattern={savedPatterns[inlineForm.index]?.beatPattern ?? []}
                    onChangeName={(name) =>
                      setInlineForm({
                        type: "rename",
                        index: inlineForm.index,
                        name,
                      })
                    }
                    onCancel={() => setInlineForm(null)}
                    onConfirm={handleRename}
                  />
                </View>
              )}

              <View className="overflow-hidden rounded-[14px] bg-background">
                {savedPatterns.map((saved, i) => (
                  <SavedPatternRow
                    key={`${saved.name}${i}`}
                    saved={saved}
                    showSeparator={i > 0}
                    onPress={() => {
                      onApplyPattern(saved.beatPattern);
                      onClose();
                    }}
                    onKebab={() => handleKebab(i)}
                  />
                ))}
              </View>
            </>
          )}
        </SheetScrollView>
      </>
    </Sheet>
  );
}

function PresetCard({
  label,
  pattern,
  selected,
  onPress,
}: {
  label: string;
  pattern: BeatAccent[];
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "w-[30%] items-start gap-2 rounded-[14px] p-3",
        selected
          ? "bg-primary/10 border-2 border-primary"
          : "border border-border bg-background",
      )}
    >
      {({ pressed }) => (
        <>
          <View className="w-full flex-row items-center justify-between">
            <Text
              className={cn(
                "font-sans-semibold text-[22px]",
                pressed ? "text-muted-fg" : "text-foreground",
              )}
            >
              {label}
            </Text>
            {selected && (
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle" }}
                size={18}
                tintColor={colors.primary}
              />
            )}
          </View>
          <PatternDots pattern={pattern} />
        </>
      )}
    </Pressable>
  );
}

function SavedPatternRow({
  saved,
  showSeparator,
  onPress,
  onKebab,
}: {
  saved: SavedPattern;
  showSeparator: boolean;
  onPress: () => void;
  onKebab: () => void;
}) {
  const colors = useColors();

  return (
    <View>
      {showSeparator && (
        <View className="ml-4 h-px" style={{ backgroundColor: colors.border }} />
      )}
      <Pressable onPress={onPress} className="flex-row items-center px-4 py-3">
        {({ pressed }) => (
          <>
            <View className="flex-1">
              <Text
                className={cn(
                  "font-sans-semibold text-[15px]",
                  pressed ? "text-muted-fg" : "text-foreground",
                )}
              >
                {saved.name}
              </Text>
              <Text className="text-xs text-muted-fg">
                {pluralRu(saved.beatPattern.length, "доля", "доли", "долей")}
              </Text>
            </View>
            <View className="flex-1">
              <PatternDots pattern={saved.beatPattern} />
            </View>
            <Pressable onPress={onKebab} hitSlop={8} className="p-1">
              <SymbolView
                name={{ ios: "ellipsis", android: "more_vert" }}
                size={18}
                tintColor={colors.mutedFg}
              />
            </Pressable>
          </>
        )}
      </Pressable>
    </View>
  );
}

function LegendDot({
  color,
  border,
  label,
}: {
  color: string;
  border?: string;
  label: string;
}) {
  return (
    <View className="flex-row items-center gap-[5px]">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          borderWidth: border ? 1 : 0,
          borderColor: border,
        }}
      />
      <Text className="text-xs text-muted-fg">{label}</Text>
    </View>
  );
}
