// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Redirect } from "expo-router";

import { hasPendingLegacyReview } from "@/features/migration";

export default function Index() {
  return <Redirect href={hasPendingLegacyReview() ? "/migration" : "/(tabs)/home"} />;
}
