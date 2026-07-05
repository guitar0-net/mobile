// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Jest mock for expo-crypto.
 *
 * jest-expo's native-module auto-mock returns `undefined` from every method,
 * which is useless for code that needs actual unique ids. Node's built-in
 * `crypto.randomUUID` is a real, collision-safe implementation available in
 * the Jest/Node environment, so we delegate to it instead of faking one.
 */

const { randomUUID } = require("node:crypto");

module.exports = {
  randomUUID: jest.fn(() => randomUUID()),
};
