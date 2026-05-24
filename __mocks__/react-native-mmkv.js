// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

const { jest } = require("@jest/globals");

/**
 * Jest mock for react-native-mmkv.
 * Provides a pure in-memory MMKV-like instance; no native code involved.
 * Mirrors the API surface used by src/lib/settings/.
 */

function createMMKVInstance() {
  const store = new Map();
  const listeners = new Set();

  const notifyListeners = (key) => {
    listeners.forEach((fn) => fn(key));
  };

  return {
    get id() {
      return "mock";
    },
    get length() {
      return store.size;
    },

    set(key, value) {
      if (key === "") throw new Error("Cannot set a value for an empty key!");
      store.set(key, value);
      notifyListeners(key);
    },

    getString(key) {
      const v = store.get(key);
      return typeof v === "string" ? v : undefined;
    },

    getNumber(key) {
      const v = store.get(key);
      return typeof v === "number" ? v : undefined;
    },

    getBoolean(key) {
      const v = store.get(key);
      return typeof v === "boolean" ? v : undefined;
    },

    getBuffer(key) {
      const v = store.get(key);
      return v instanceof Uint8Array ? v : undefined;
    },

    contains(key) {
      return store.has(key);
    },

    remove(key) {
      const deleted = store.delete(key);
      if (deleted) notifyListeners(key);
      return deleted;
    },

    clearAll() {
      const keys = [...store.keys()];
      store.clear();
      keys.forEach(notifyListeners);
    },

    getAllKeys() {
      return [...store.keys()];
    },

    addOnValueChangedListener(fn) {
      listeners.add(fn);
      return { remove: () => listeners.delete(fn) };
    },

    recrypt() {},
    trim() {},
  };
}

// Single shared instance per ID — consistent with how real MMKV works.
const instances = new Map();

function createMMKV(config = { id: "mmkv.default" }) {
  const id = config?.id ?? "mmkv.default";
  if (!instances.has(id)) {
    instances.set(id, createMMKVInstance());
  }
  return instances.get(id);
}

module.exports = {
  createMMKV,
  useMMKV: jest.fn(),
  useMMKVString: jest.fn((key) => [undefined, jest.fn()]),
  useMMKVNumber: jest.fn((key) => [undefined, jest.fn()]),
  useMMKVBoolean: jest.fn((key) => [undefined, jest.fn()]),
  useMMKVObject: jest.fn((key) => [undefined, jest.fn()]),
  useMMKVBuffer: jest.fn((key) => [undefined, jest.fn()]),
  useMMKVListener: jest.fn(),
  useMMKVKeys: jest.fn(() => [[]]),
};
