// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ScrollView } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

import { buildGridColumns, type ActivityDayBucket } from "../logic";

const CELL_SIZE = 12;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;

type ActivityGridProps = {
  history: ActivityDayBucket[];
};

export function ActivityGrid({ history }: ActivityGridProps) {
  const colors = useColors();
  const columns = buildGridColumns(history);
  const bucketFills = [
    colors.border,
    withAlpha(colors.primary, 0.2),
    withAlpha(colors.primary, 0.4),
    withAlpha(colors.primary, 0.6),
    withAlpha(colors.primary, 0.8),
    colors.primary,
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={columns.length * CELL_STEP} height={7 * CELL_STEP}>
        {columns.map((column, columnIndex) =>
          column.map(
            (cell, rowIndex) =>
              cell && (
                <Rect
                  key={cell.date}
                  testID={`activity-cell-${cell.date}`}
                  x={columnIndex * CELL_STEP}
                  y={rowIndex * CELL_STEP}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={bucketFills[cell.bucket]}
                />
              ),
          ),
        )}
      </Svg>
    </ScrollView>
  );
}
