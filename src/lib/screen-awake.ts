// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect, useId } from "react";

/**
 * Keeps the screen on while `active` is true and the calling component is mounted.
 * Each caller holds its own tag, so screens never release each other's lock.
 */
export function useScreenAwake(active: boolean): void {
  const tag = useId();

  useEffect(() => {
    if (!active) return;
    void activateKeepAwakeAsync(tag);
    return () => {
      void deactivateKeepAwake(tag);
    };
  }, [active, tag]);
}
