// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { useColors } from "@/lib/themes";
import { formatHoursMinutesRu, withAlpha } from "@/lib/utils";

import {
  buildGridColumns,
  buildMonthLabels,
  formatCellDateRu,
  type ActivityDayBucket,
  type GridCell,
} from "../logic";

function describeCell(cell: NonNullable<GridCell>): string {
  const duration =
    cell.totalSeconds > 0 ? formatHoursMinutesRu(cell.totalSeconds) : "нет занятий";
  return `${formatCellDateRu(cell.date)} · ${duration}`;
}

const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const MONTH_LABEL_HEIGHT = 16;

type ActivityGridProps = {
  history: ActivityDayBucket[];
};

export function ActivityGrid({ history }: ActivityGridProps) {
  const colors = useColors();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const columns = useMemo(() => buildGridColumns(history), [history]);
  const selectedCell = useMemo(
    () => columns.flat().find((cell) => cell?.date === selectedDate) ?? null,
    [columns, selectedDate],
  );
  const monthLabels = useMemo(() => buildMonthLabels(columns), [columns]);
  const gridWidth = columns.length * CELL_STEP;
  // Bucket 0 (no activity) is an unfilled outline rather than a solid color:
  // contrast themes map --color-border to the same value as --color-primary,
  // which would otherwise make an empty day look identical to a maxed-out one.
  const bucketFills = [
    "none",
    withAlpha(colors.primary, 0.2),
    withAlpha(colors.primary, 0.4),
    withAlpha(colors.primary, 0.6),
    withAlpha(colors.primary, 0.8),
    colors.primary,
  ];

  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="heading" className="text-base">
          Активность за год
        </Text>
        {selectedCell && (
          <Text variant="caption" className="text-xs">
            {describeCell(selectedCell)}
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Opens already scrolled to today (the right edge) instead of the
        // start of the year — set as the initial native offset so there's
        // no left-to-right jump on mount. Any x past the real content width
        // is clamped to the max scroll offset once the content is measured.
        contentOffset={{ x: gridWidth, y: 0 }}
      >
        <View>
          <View style={{ width: gridWidth, height: MONTH_LABEL_HEIGHT }}>
            {monthLabels.map((month) => (
              <Text
                key={month.columnIndex}
                variant="caption"
                className="absolute text-xs"
                style={{ left: month.columnIndex * CELL_STEP }}
              >
                {month.label}
              </Text>
            ))}
          </View>
          <Svg width={gridWidth} height={7 * CELL_STEP}>
            {columns.map((column, columnIndex) =>
              column.map(
                (cell, rowIndex) =>
                  cell && (
                    <Rect
                      key={cell.date}
                      testID={`activity-cell-${cell.date}`}
                      onPress={() => setSelectedDate(cell.date)}
                      x={columnIndex * CELL_STEP}
                      y={rowIndex * CELL_STEP}
                      width={CELL_SIZE}
                      height={CELL_SIZE}
                      rx={2}
                      fill={bucketFills[cell.bucket]}
                      stroke={cell.bucket === 0 ? colors.border : "none"}
                      strokeWidth={cell.bucket === 0 ? 1 : 0}
                    />
                  ),
              ),
            )}
          </Svg>
        </View>
      </ScrollView>

      <View className="mt-2 flex-row items-center justify-end gap-1">
        <Text variant="caption" className="text-xs">
          Меньше
        </Text>
        {bucketFills.map((fill, bucket) => (
          <View
            key={bucket}
            className="h-3 w-3 rounded-sm"
            style={{
              backgroundColor: fill === "none" ? "transparent" : fill,
              borderWidth: bucket === 0 ? 1 : 0,
              borderColor: colors.border,
            }}
          />
        ))}
        <Text variant="caption" className="text-xs">
          Больше
        </Text>
      </View>
    </View>
  );
}
