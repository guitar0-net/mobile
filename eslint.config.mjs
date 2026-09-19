// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import tsPlugin from "@typescript-eslint/eslint-plugin";
import { defineConfig, globalIgnores } from "eslint/config";
import expo from "eslint-config-expo/flat.js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";

const eslintConfig = defineConfig([
  globalIgnores([".expo/"]),
  ...expo,
  prettierConfig,
  {
    files: ["__mocks__/**/*.js", "jest.setup.js"],
    languageOptions: {
      globals: globals.jest,
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    plugins: {
      prettier: prettierPlugin,
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "prettier/prettier": "error",
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/no-duplicates": "error",
      // eslint-config-expo's allow-list only covers Metro's built-in asset
      // extensions; .lottie is a custom extension we added to assetExts.
      "@typescript-eslint/no-require-imports": [
        "warn",
        {
          allow: [
            "\\.(aac|aiff|avif|bmp|caf|db|gif|heic|html|jpeg|jpg|json|lottie|m4a|m4v|mov|mp3|mp4|mpeg|mpg|otf|pdf|png|psd|svg|ttf|wav|webm|webp|xml|yaml|yml|zip)$",
          ],
        },
      ],
    },
  },
  {
    files: ["*.js", "__mocks__/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
