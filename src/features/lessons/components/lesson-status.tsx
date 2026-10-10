// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Badge } from "@/components/ui/badge";
import { useProgress } from "@/features/settings";
import { describeRemainingItems } from "@/lib/utils";

import { remainingLessonSteps } from "../logic";

type Props = {
  lessonId: string;
  songCount: number;
};

export function LessonStatus({ lessonId, songCount }: Props) {
  const { progress } = useProgress();
  const { remainingSongs, videoRemaining } = remainingLessonSteps(
    { songCount },
    progress[lessonId],
  );

  if (remainingSongs === 0 && !videoRemaining) {
    return (
      <Badge variant="outline" icon={{ ios: "checkmark", android: "check" }}>
        Пройден
      </Badge>
    );
  }

  const remaining = describeRemainingItems(remainingSongs, videoRemaining);
  return (
    <Badge variant="outline">
      {remaining.charAt(0).toUpperCase() + remaining.slice(1)}
    </Badge>
  );
}
