// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { resetSyncForTesting } from "./__tests__/testing";
import { readDefaults, useSyncStore } from "./store";

beforeEach(() => {
  resetSyncForTesting();
});

test("lastSyncedAt defaults to null", () => {
  expect(useSyncStore.getState().lastSyncedAt).toBeNull();
});

test("lastSyncedAt survives an app restart", () => {
  useSyncStore.getState().setLastSyncedAt(1700000000000);

  useSyncStore.setState(readDefaults());

  expect(useSyncStore.getState().lastSyncedAt).toBe(1700000000000);
});

test("a failed sync is forgotten on restart", () => {
  useSyncStore.setState({
    syncStatus: "failed",
    lastFailure: { kind: "offline", label: "Нет соединения", reason: "…" },
  });

  useSyncStore.setState(readDefaults());

  expect(useSyncStore.getState()).toMatchObject({
    syncStatus: "idle",
    lastFailure: null,
  });
});
