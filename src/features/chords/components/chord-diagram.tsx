// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SvgXml } from "react-native-svg";

import type { DiagramOrientation, DiagramSize } from "@/features/settings";
import { useColors } from "@/lib/themes";

const CHORD_WIDTH = {
  vertical: { 1: 101, 2: 115, 3: 130, 4: 144, 5: 173 },
  horizontal: { 1: 133, 2: 189, 3: 244, 4: 289, 5: 355 },
} as const;

// Heights derived from SVG viewBox ratios: horizontal 217×88 (×0.4055), vertical 91×214 (×2.352)
const CHORD_HEIGHT = {
  vertical: { 1: 237, 2: 271, 3: 305, 4: 338, 5: 407 },
  horizontal: { 1: 54, 2: 77, 3: 99, 4: 117, 5: 144 },
} as const;

type Props = {
  chord: { svgHorizontal: string | null; svgVertical: string | null };
  orientation: DiagramOrientation;
  size: DiagramSize;
};

export function ChordDiagram({ chord, orientation, size }: Props) {
  const colors = useColors();
  const svg =
    orientation === "horizontal"
      ? (chord.svgHorizontal ?? chord.svgVertical)
      : (chord.svgVertical ?? chord.svgHorizontal);

  if (!svg) return null;

  return (
    <SvgXml
      xml={svg}
      width={CHORD_WIDTH[orientation][size]}
      height={CHORD_HEIGHT[orientation][size]}
      color={colors.foreground}
    />
  );
}
