// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { HeaderButton } from "@/components/ui/header-button";
import { recordSongCompletion } from "@/features/activity";
import { useProgress } from "@/features/settings";
import { useColors } from "@/lib/themes";

type CompleteButtonProps = {
  lessonId: string;
  lessonTitle: string;
  songId: string;
  songTitle: string;
  testID?: string;
};

export function CompleteButton({
  lessonId,
  lessonTitle,
  songId,
  songTitle,
  testID,
}: CompleteButtonProps) {
  const { progress, setSongCompleted } = useProgress();
  const colors = useColors();
  const isCompleted = (progress[lessonId]?.completedSongIds ?? []).includes(songId);

  return (
    <HeaderButton
      testID={testID}
      icon={
        isCompleted
          ? { ios: "checkmark.circle.fill", android: "check_circle" }
          : { ios: "checkmark.circle", android: "check_circle" } //TODO
      }
      tintColor={isCompleted ? colors.success : colors.mutedFg}
      onPress={() => {
        const nextCompleted = !isCompleted;
        setSongCompleted(lessonId, songId, nextCompleted);
        recordSongCompletion(lessonTitle, songId, songTitle, nextCompleted);
      }}
    />
  );
}
