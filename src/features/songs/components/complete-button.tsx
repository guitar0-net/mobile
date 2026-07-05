// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { HeaderButton } from "@/components/ui/header-button";
import { useProgress } from "@/features/settings";
import { useColors } from "@/lib/themes";

type CompleteButtonProps = {
  lessonId: string;
  songId: string;
};

export function CompleteButton({ lessonId, songId }: CompleteButtonProps) {
  const { progress, setSongCompleted } = useProgress();
  const colors = useColors();
  const isCompleted = (progress[lessonId]?.completedSongIds ?? []).includes(songId);

  return (
    <HeaderButton
      icon={
        isCompleted
          ? { ios: "checkmark.circle.fill", android: "check_circle" }
          : { ios: "checkmark.circle", android: "check_circle" } //TODO
      }
      tintColor={isCompleted ? colors.success : colors.mutedFg}
      onPress={() =>
        isCompleted
          ? setSongCompleted(lessonId, songId, false)
          : setSongCompleted(lessonId, songId, true)
      }
    />
  );
}
