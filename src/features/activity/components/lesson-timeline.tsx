// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { View } from "react-native";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { formatTimeRu } from "@/lib/utils";

import {
  collapseConsecutiveViews,
  groupByLocalDay,
  journalDayHeading,
  localDayKey,
} from "../logic";
import type { ActivityTimelineEntry } from "../queries";

type LessonTimelineProps = {
  entries: ActivityTimelineEntry[];
  isLoadingMore?: boolean;
};

function entryLabel(entry: ActivityTimelineEntry, repeatCount: number): string {
  if (entry.type === "lesson_video_viewed") {
    const suffix = repeatCount > 1 ? ` ×${repeatCount}` : "";
    return `Просмотрено: «${entry.title}»${suffix}`;
  }
  if (entry.value) return `Завершена песня «${entry.title}»`;
  return `Отменено: «${entry.title}»`;
}

function TimelineRow({
  entry,
  repeatCount,
}: {
  entry: ActivityTimelineEntry;
  repeatCount: number;
}) {
  const colors = useColors();
  const isUndone = entry.type === "song_completed" && !entry.value;

  let icon: SymbolViewProps["name"];
  if (entry.type === "lesson_video_viewed") {
    icon = { ios: "play.fill", android: "play_arrow" };
  } else if (isUndone) {
    icon = { ios: "arrow.uturn.backward", android: "undo" };
  } else {
    icon = { ios: "music.note", android: "music_note" };
  }

  return (
    <View className="flex-row items-center gap-3 py-2">
      <SymbolView
        name={icon}
        size={18}
        tintColor={isUndone ? colors.mutedFg : colors.primary}
      />
      <Text variant="body" className={isUndone ? "flex-1 text-muted-fg" : "flex-1"}>
        {entryLabel(entry, repeatCount)}
      </Text>
      <Text variant="caption">{formatTimeRu(entry.occurredAt)}</Text>
    </View>
  );
}

export function LessonTimeline({ entries, isLoadingMore }: LessonTimelineProps) {
  const todayKey = localDayKey(new Date());
  const groups = groupByLocalDay(entries);

  return (
    <View className="mt-4">
      {groups.map((group) => (
        <View key={group.dayKey} className="mb-4">
          <Text
            variant="caption"
            className="mb-1 text-xs uppercase tracking-wider text-muted-fg"
          >
            {journalDayHeading(group.dayKey, todayKey)}
          </Text>
          {collapseConsecutiveViews(group.entries).map(({ entry, repeatCount }) => (
            <TimelineRow key={entry.id} entry={entry} repeatCount={repeatCount} />
          ))}
        </View>
      ))}
      {isLoadingMore && (
        <Text variant="caption" className="py-2 text-center text-muted-fg">
          Загрузка…
        </Text>
      )}
    </View>
  );
}
