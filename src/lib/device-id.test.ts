// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getDeviceId } from "./device-id";
import { storage } from "./storage";

beforeEach(() => {
  storage.clearAll();
});

describe("getDeviceId", () => {
  test("generates and persists a deviceId on first call", () => {
    expect(storage.getString("activity.deviceId")).toBeUndefined();

    const id = getDeviceId();

    expect(id).toEqual(expect.any(String));
    expect(id.length).toBeGreaterThan(0);
    expect(storage.getString("activity.deviceId")).toBe(id);
  });

  test("returns the same id on subsequent calls", () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(second).toBe(first);
  });

  test("returns an already-persisted id instead of generating a new one", () => {
    storage.set("activity.deviceId", "existing-device-id");
    expect(getDeviceId()).toBe("existing-device-id");
  });
});
