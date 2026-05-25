// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * Jest transform for .sql files.
 * drizzle-kit generates migration files that are imported as string assets by
 * Metro. This transform does the same for Jest: it exports the file content as
 * the default export string.
 */

module.exports = {
  process(sourceText) {
    const escaped = JSON.stringify(sourceText);
    return {
      code: `module.exports = ${escaped};`,
    };
  },
};
