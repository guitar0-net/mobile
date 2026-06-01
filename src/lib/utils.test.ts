// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { cn, formatTodayRu } from "./utils";

describe("cn", () => {
  test("joins truthy strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  test("filters out falsy values", () => {
    expect(cn("a", undefined, null, false, "b")).toBe("a b");
  });

  test("returns empty string when all values are falsy", () => {
    expect(cn(undefined, null, false)).toBe("");
  });

  test("handles a single class", () => {
    expect(cn("only")).toBe("only");
  });

  test("handles conditional classes", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("base", isActive && "active", isDisabled && "disabled")).toBe(
      "base active",
    );
  });

  test("resolves Tailwind conflicts — last class wins", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("bg-red-500", "bg-blue-500")).toBe("bg-blue-500");
    expect(cn("p-4", "px-6")).toBe("p-4 px-6");
  });

  test("accepts arrays and nested falsy values (clsx compat)", () => {
    expect(cn(["a", false, "b"], undefined, "c")).toBe("a b c");
  });
});

describe("formatTodayRu", () => {
  test("formats sunday correctly", () => {
    expect(formatTodayRu(new Date("2026-05-31"))).toBe("Воскресенье, 31 мая");
  });

  test("formats monday correctly", () => {
    expect(formatTodayRu(new Date("2026-06-01"))).toBe("Понедельник, 1 июня");
  });

  test("starts with uppercase", () => {
    const result = formatTodayRu(new Date("2026-05-31"));
    expect(result[0]).toBe(result[0].toUpperCase());
  });
});
