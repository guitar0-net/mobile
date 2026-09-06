// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ErrorCode } from "expo-iap";

import { ApiError } from "@/lib/network";

import {
  describePurchaseError,
  describeVerifyError,
  isPermanentVerifyRejection,
} from "./purchase-errors";

function makePurchaseError(code: ErrorCode) {
  return { code, message: "irrelevant" };
}

describe("describeVerifyError", () => {
  test("says the payment is still being collected on a 409", () => {
    expect(describeVerifyError(new ApiError(409))).toBe(
      "Ожидаем оплату. Подтвердим, как только магазин её проведёт",
    );
  });

  test("does not treat a 409 as a permanent rejection", () => {
    expect(isPermanentVerifyRejection(new ApiError(409))).toBe(false);
  });

  test("promises another attempt on a 502 (store unreachable)", () => {
    expect(describeVerifyError(new ApiError(502))).toBe(
      "Покупка ещё не подтверждена. Мы попробуем ещё раз позже",
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

  test.each([[null], [undefined], ["boom"], [new Error("boom")]])(
    "falls back to a generic message for a rejection without a code: %p",
    (error) => {
      expect(describePurchaseError(error)).toBe(
        "Не удалось совершить покупку. Попробуйте ещё раз",
      );
    },
  );
});
