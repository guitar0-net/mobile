// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createMMKV } from "react-native-mmkv";

export const storage = createMMKV({ id: "reports" });

const CONTACT_EMAIL_KEY = "contactEmail";

export function readContactEmail(): string {
  return storage.getString(CONTACT_EMAIL_KEY) ?? "";
}

export function saveContactEmail(email: string): void {
  if (email) storage.set(CONTACT_EMAIL_KEY, email);
  else storage.remove(CONTACT_EMAIL_KEY);
}
