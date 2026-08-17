// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ErrorCode } from "expo-iap";

import { ApiError } from "@/lib/network";

import { describePurchaseError, describeVerifyError } from "./purchase-errors";

function makePurchaseError(code: ErrorCode) {
  return { code, message: "irrelevant" };
}

describe("describeVerifyError", () => {
  test("tells the user to retry later on a 502 (store unreachable)", () => {
    expect(describeVerifyError(new ApiError(502))).toBe(
      "Магазин временно недоступен. Попробуйте ещё раз позже",
    );
  });

  test("treats a 422 as a permanent rejection", () => {
    expect(describeVerifyError(new ApiError(422))).toBe(
      "Не удалось подтвердить покупку",
    );
  });

  test("treats a 400 as a permanent rejection", () => {
    expect(describeVerifyError(new ApiError(400))).toBe(
      "Не удалось подтвердить покупку",
    );
  });

  test("tells the user to retry later on an unmapped server error", () => {
    expect(describeVerifyError(new ApiError(500))).toBe(
      "Не удалось подтвердить покупку. Попробуйте ещё раз позже",
    );
  });

  test("falls back to a generic network message for anything else", () => {
    expect(describeVerifyError(new Error("boom"))).toBe(
      "Не удалось подтвердить покупку. Проверьте подключение к интернету",
    );
  });
});

describe("describePurchaseError", () => {
  test("returns null for a user-cancelled purchase", () => {
    expect(
      describePurchaseError(makePurchaseError(ErrorCode.UserCancelled)),
    ).toBeNull();
  });

  test("tells the user they already own this tier", () => {
    expect(describePurchaseError(makePurchaseError(ErrorCode.AlreadyOwned))).toBe(
      "Вы уже подарили этот вариант поддержки",
    );
  });

  test("reports an unavailable item", () => {
    expect(describePurchaseError(makePurchaseError(ErrorCode.ItemUnavailable))).toBe(
      "Этот вариант поддержки сейчас недоступен в магазине",
    );
  });

  test("reports a network problem", () => {
    expect(describePurchaseError(makePurchaseError(ErrorCode.NetworkError))).toBe(
      "Нет соединения с магазином. Проверьте интернет",
    );
  });

  test("falls back to a generic message for an unmapped error code", () => {
    expect(describePurchaseError(makePurchaseError(ErrorCode.Unknown))).toBe(
      "Не удалось совершить покупку. Попробуйте ещё раз",
    );
  });
});
