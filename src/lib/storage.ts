// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createMMKV } from "react-native-mmkv";

// The "activity" id is historical: this store was opened by features/activity
// before lib/ needed it too. Renaming it would point every existing install at
// an empty store, orphaning the device id and the activity stats already in it.
export const storage = createMMKV({ id: "activity" });
