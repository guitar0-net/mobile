// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

class PostHog {
  constructor() {
    this.capture = jest.fn();
    this.screen = jest.fn();
    this.captureException = jest.fn();
    this.register = jest.fn();
    this.registerForSession = jest.fn();
    this.flush = jest.fn(() => Promise.resolve());
  }
}

module.exports = { __esModule: true, default: PostHog, PostHog };
