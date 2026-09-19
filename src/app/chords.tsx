// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Stack } from "expo-router";

import { ChordsHeaderActions, ChordsScreen } from "@/features/chords";

const screenOptions = {
  title: "Аккорды",
  headerBackTitle: "Назад",
  headerRight: () => <ChordsHeaderActions />,
};

export default function ChordsRoute() {
  return (
    <>
      <Stack.Screen options={screenOptions} />
      <ChordsScreen />
    </>
  );
}
