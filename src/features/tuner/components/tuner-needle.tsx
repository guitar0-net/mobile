// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { useColors } from "@/lib/themes";
import { withAlpha } from "@/lib/utils";

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// SVG coordinate system: viewBox 0 0 200 125
const CX = 100;
const CY = 112;
const R = 85;
const NEEDLE_LEN = 78;
const MAX_ANGLE_DEG = 60; // ±60° corresponds to ±50 cents
const IN_TUNE_THRESHOLD = 5;

function arcPoint(r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function centsToAngle(cents: number): number {
  "worklet";
  return Math.max(-50, Math.min(50, cents)) * (MAX_ANGLE_DEG / 50);
}

function angleToEndpoint(angleDeg: number): { x: number; y: number } {
  "worklet";
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + NEEDLE_LEN * Math.sin(rad), y: CY - NEEDLE_LEN * Math.cos(rad) };
}

const arcStart = arcPoint(R, -MAX_ANGLE_DEG);
const arcEnd = arcPoint(R, MAX_ANGLE_DEG);
const ARC_PATH = `M ${arcStart.x.toFixed(2)} ${arcStart.y.toFixed(2)} A ${R} ${R} 0 0 1 ${arcEnd.x.toFixed(2)} ${arcEnd.y.toFixed(2)}`;

const TICKS = Array.from({ length: 21 }, (_, i) => {
  const cents = -50 + i * 5;
  const isMajor = cents % 25 === 0;
  const angleDeg = centsToAngle(cents);
  return {
    cents,
    isMajor,
    outer: arcPoint(R, angleDeg),
    inner: arcPoint(isMajor ? R - 10 : R - 5, angleDeg),
  };
});

type Props = {
  cents: number;
  active: boolean;
};

export function TunerNeedle({ cents, active }: Props) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const centsShared = useSharedValue(0);

  useEffect(() => {
    centsShared.value = withSpring(active ? cents : 0, {
      damping: 22,
      stiffness: 160,
      mass: 0.6,
    });
  }, [cents, active, centsShared]);

  const needleLineProps = useAnimatedProps(() => {
    const ep = angleToEndpoint(centsToAngle(centsShared.value));
    return { x2: ep.x, y2: ep.y };
  });

  const inTune = active && Math.abs(cents) < IN_TUNE_THRESHOLD;
  const needleColor = inTune ? colors.success : colors.foreground;
  const tickColor = withAlpha(colors.mutedFg, 0.45);
  const arcColor = withAlpha(colors.mutedFg, 0.25);
  const labelColor = colors.mutedFg;

  const svgWidth = screenWidth - 32;
  const svgHeight = Math.round(svgWidth * (130 / 200));

  return (
    <View>
      <Svg width={svgWidth} height={svgHeight} viewBox="0 0 200 130">
        {/* Background arc */}
        <Path
          d={ARC_PATH}
          stroke={arcColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {TICKS.map(({ cents: tc, outer, inner, isMajor }) => (
          <Line
            key={tc}
            x1={outer.x}
            y1={outer.y}
            x2={inner.x}
            y2={inner.y}
            stroke={tickColor}
            strokeWidth={isMajor ? 1.5 : 0.8}
          />
        ))}

        {/* Animated needle */}
        <AnimatedLine
          x1={CX}
          y1={CY}
          animatedProps={needleLineProps}
          stroke={needleColor}
          strokeWidth={2.5}
          strokeLinecap="round"
        />

        {/* Pivot dot */}
        <Circle cx={CX} cy={CY} r={5} fill={needleColor} />

        {/* Labels: side labels near arc endpoints, center label below pivot */}
        <SvgText x={4} y={82} fontSize={9} fill={labelColor} textAnchor="start">
          -50¢
        </SvgText>
        <SvgText x={CX} y={124} fontSize={9} fill={labelColor} textAnchor="middle">
          0¢
        </SvgText>
        <SvgText x={196} y={82} fontSize={9} fill={labelColor} textAnchor="end">
          +50¢
        </SvgText>
      </Svg>
    </View>
  );
}
