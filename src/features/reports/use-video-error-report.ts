// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useNetworkState } from "expo-network";
import { useState } from "react";

import { submitReport } from "./queue";

export type VideoSource = "stream" | "offline";

/** One-tap report for a lesson video that failed to play. */
export function useVideoErrorReport(lessonId: string, source: VideoSource) {
  const network = useNetworkState();
  const [sent, setSent] = useState(false);
  const noInternet = network.isInternetReachable === false;
  const isOffline = source === "stream" && noInternet;

  function send(playerError: string) {
    submitReport(
      {
        target: { type: "lesson", id: lessonId },
        reason: "broken_media",
        message: `source: ${source}; network: ${network.type}; error: ${playerError}`,
        screen: "/video/[id]",
        source: "video_error",
      },
      { offline: noInternet },
    );
    setSent(true);
  }

  return { canReport: !isOffline, isOffline, send, sent };
}
