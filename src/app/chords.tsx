// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";

import { ChordsScreen } from "@/features/chords";

export default function ChordsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Аккорды", headerBackTitle: "Назад" }} />
      <ChordsScreen />
    </>
  );
}
