// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { useDiagramSettings, type DiagramSize } from "@/features/settings";

export function ChordsHeaderActions() {
  const { chordSize, chordOrientation, setChordSize, setChordOrientation } =
    useDiagramSettings();

  const orientationIcon =
    chordOrientation === "vertical"
      ? { ios: "arrow.clockwise" as const, android: "rotate_right" as const }
      : { ios: "arrow.counterclockwise" as const, android: "rotate_left" as const };

  return (
    <View className="flex-row items-center gap-1">
      <Button
        testID="btn-orientation"
        size="icon-sm"
        variant="ghost"
        icon={orientationIcon}
        onPress={() =>
          setChordOrientation(
            chordOrientation === "horizontal" ? "vertical" : "horizontal",
          )
        }
      />
      <Button
        testID="btn-size-minus"
        size="icon-sm"
        variant="ghost"
        icon={{ ios: "minus", android: "remove" }}
        onPress={() => setChordSize((chordSize - 1) as DiagramSize)}
        disabled={chordSize === 1}
      />
      <Button
        testID="btn-size-plus"
        size="icon-sm"
        variant="ghost"
        icon={{ ios: "plus", android: "add" }}
        onPress={() => setChordSize((chordSize + 1) as DiagramSize)}
        disabled={chordSize === 5}
      />
    </View>
  );
}
