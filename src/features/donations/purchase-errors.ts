// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ErrorCode } from "expo-iap";

import { ApiError } from "@/lib/network";

// expo-iap's onPurchaseError callback and its exported PurchaseError type
// disagree on whether `code` is required, so this accepts either shape.
type PurchaseErrorLike = { code?: ErrorCode | null };

export const RESTORE_FAILED_MESSAGE =
  "Не удалось восстановить покупки. Проверьте подключение к интернету";

// The server rejects the receipt itself with 400/422 (PurchaseVerificationError
// and UnknownDonationProductError in its services.py); 502 means it only failed
// to reach the store, which a retry can still fix.
const PERMANENT_REJECTION_STATUSES = [400, 422];

export function isPermanentVerifyRejection(error: unknown): boolean {
  return (
    error instanceof ApiError && PERMANENT_REJECTION_STATUSES.includes(error.status)
  );
}

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

/** Returns null when the failure needs no message, such as a cancellation. */
export function describePurchaseError(error: unknown): string | null {
  switch ((error as PurchaseErrorLike | null)?.code) {
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
