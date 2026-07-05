// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as Crypto from "expo-crypto";

import { storage } from "./storage";

const KEY = "activity.deviceId";

// Anonymous identifier generated once and persisted in MMKV, so that when
// server accounts ship, a device's history can be attached to an account in
// one request without re-tagging existing rows.
export function getDeviceId(): string {
  const existing = storage.getString(KEY);
  if (existing) return existing;

  const generated = Crypto.randomUUID();
  storage.set(KEY, generated);
  return generated;
}
