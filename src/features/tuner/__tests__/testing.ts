// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { storage } from "@/features/settings/storage";

import { useTunerStore } from "../store";

export function resetTunerForTesting(): void {
  storage.clearAll();
  useTunerStore.setState({
    tuningId: "standard",
    tuningForkEnabled: false,
    detectedFrequency: null,
    selectedStringIndex: null,
  });
}
