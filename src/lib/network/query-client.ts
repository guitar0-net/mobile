// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { QueryClient } from "@tanstack/react-query";

export const QUERY_DEFAULTS = {
  queries: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  },
} as const;

export const queryClient = new QueryClient({
  defaultOptions: QUERY_DEFAULTS,
});
