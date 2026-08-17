// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ErrorCode } from "expo-iap";

import { ApiError } from "@/lib/network";

// expo-iap's own onPurchaseError callback and its publicly exported
// PurchaseError type disagree on whether `code` is required — this only
// needs to read `code`, so it accepts either shape rather than picking one.
type PurchaseErrorLike = { code?: ErrorCode | null };

export const RESTORE_FAILED_MESSAGE =
  "Не удалось восстановить покупки. Проверьте подключение к интернету";

// 422/400 mean the server looked at the receipt and rejected it (see
// PurchaseVerificationError and UnknownDonationProductError in the server's
// services.py) — replaying the same request can never turn into a success,
// unlike 502 (the store was unreachable from the server).
const PERMANENT_REJECTION_STATUSES = [400, 422];

export function isPermanentVerifyRejection(error: unknown): boolean {
  return (
    error instanceof ApiError && PERMANENT_REJECTION_STATUSES.includes(error.status)
  );
}

// Maps /donations/verify/'s HTTP status back to a message a donor can act on.
export function describeVerifyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 502) {
      return "Магазин временно недоступен. Попробуйте ещё раз позже";
    }
    if (isPermanentVerifyRejection(error)) {
      return "Не удалось подтвердить покупку";
    }
    return "Не удалось подтвердить покупку. Попробуйте ещё раз позже";
  }
  return "Не удалось подтвердить покупку. Проверьте подключение к интернету";
}

// Returns null for cases that need no message at all — the user already
// knows they cancelled, so surfacing an error for it would just be noise.
export function describePurchaseError(error: PurchaseErrorLike): string | null {
  switch (error.code) {
    case ErrorCode.UserCancelled:
      return null;
    case ErrorCode.AlreadyOwned:
      return "Вы уже подарили этот вариант поддержки";
    case ErrorCode.ItemUnavailable:
    case ErrorCode.SkuNotFound:
      return "Этот вариант поддержки сейчас недоступен в магазине";
    case ErrorCode.NetworkError:
    case ErrorCode.ServiceTimeout:
    case ErrorCode.ServiceDisconnected:
    case ErrorCode.ConnectionClosed:
      return "Нет соединения с магазином. Проверьте интернет";
    default:
      return "Не удалось совершить покупку. Попробуйте ещё раз";
  }
}
