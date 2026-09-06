// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { migrate } from "drizzle-orm/expo-sqlite/migrator";

import { _resetDbForTesting, getDb, initDb } from "./index";

jest.mock("drizzle-orm/expo-sqlite/migrator", () => ({
  migrate: jest.fn(),
}));

const mockMigrate = jest.mocked(migrate);

beforeEach(() => {
  _resetDbForTesting();
  mockMigrate.mockReset();
});

test("getDb returns the migrated connection", async () => {
  mockMigrate.mockResolvedValue(undefined);

  const db = await initDb();

  expect(getDb()).toBe(db);
});

test("getDb refuses the connection when migrations failed", async () => {
  mockMigrate.mockRejectedValue(
    new Error("table `confirmed_donations` already exists"),
  );

  await expect(initDb()).rejects.toThrow("already exists");
  expect(() => getDb()).toThrow("Database not initialised");
});

test("a failed migration can be retried on the same connection", async () => {
  mockMigrate
    .mockRejectedValueOnce(new Error("database is locked"))
    .mockResolvedValue(undefined);

  await expect(initDb()).rejects.toThrow("database is locked");
  const db = await initDb();

  expect(getDb()).toBe(db);
  expect(mockMigrate).toHaveBeenCalledTimes(2);
});
