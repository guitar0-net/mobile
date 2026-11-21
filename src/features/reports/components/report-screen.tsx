// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useNetworkState } from "expo-network";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";

import { Button } from "@/components/ui/button";
import { ChipBar } from "@/components/ui/chip-bar";
import { HeaderButton } from "@/components/ui/header-button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { TextInput } from "@/components/ui/text-input";

import { submitReport } from "../queue";
import type { ReportTarget } from "../queue";
import { REASONS_BY_TARGET } from "../reasons";
import {
  parseReportParams,
  type ReportRequest,
  type ReportRouteParams,
} from "../report-route";
import { readContactEmail, saveContactEmail } from "../storage";
import { ReportSuccess } from "./report-success";

const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TITLES: Record<ReportTarget["type"], string> = {
  song: "Что не так с песней?",
  lesson: "Что не так с уроком?",
  app: "Ошибка или идея?",
};

export function ReportScreen() {
  const router = useRouter();
  const request = parseReportParams(useLocalSearchParams<ReportRouteParams>());

  const isValid = request !== null;
  useEffect(() => {
    if (!isValid) router.back();
  }, [isValid, router]);

  if (!request) return null;
  return <ReportForm request={request} onDone={() => router.back()} />;
}

type FormProps = {
  request: ReportRequest;
  onDone: () => void;
};

function ReportForm({ request: { target, source, from }, onDone }: FormProps) {
  const network = useNetworkState();
  const headerHeight = useHeaderHeight();
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(readContactEmail);
  const [sent, setSent] = useState<{ queued: boolean; reasonCode: string } | null>(
    null,
  );

  const reasons = REASONS_BY_TARGET[target.type];
  const reason = reasons.find((candidate) => candidate.code === reasonCode);
  const asksEmail = target.type === "app";
  const trimmedEmail = asksEmail ? email.trim() : "";
  const emailIsValid = trimmedEmail === "" || EMAIL_PATTERN.test(trimmedEmail);
  const canSend =
    reason !== undefined &&
    (!reason.requiresMessage || message.trim() !== "") &&
    emailIsValid;
  const hasDraft = !sent && message.trim() !== "";

  function handleSend() {
    if (!reason) return;
    const queued = network.isInternetReachable === false;
    submitReport(
      {
        target,
        reason: reason.code,
        message: message.trim(),
        contactEmail: trimmedEmail || undefined,
        screen: from,
        source,
      },
      { offline: queued },
    );
    if (asksEmail) saveContactEmail(trimmedEmail);
    setSent({ queued, reasonCode: reason.code });
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
          gestureEnabled: !hasDraft,
          headerLeft: () => (
            <HeaderButton
              icon={{ ios: "xmark", android: "close" }}
              accessibilityLabel="Закрыть"
              onPress={onDone}
            />
          ),
        }}
      />
      <KeyboardAvoidingView
        behavior="padding"
        enabled={Platform.OS === "android"}
        keyboardVerticalOffset={headerHeight}
        className="flex-1 bg-background"
      >
        <ScreenScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4 px-5 pb-6 pt-2"
        >
          {sent ? (
            <ReportSuccess
              queued={sent.queued}
              reasonCode={sent.reasonCode}
              onDone={onDone}
            />
          ) : (
            <>
              <Text variant="heading">{TITLES[target.type]}</Text>
              <ChipBar
                wrap
                options={reasons.map(({ code, title }) => ({
                  value: code,
                  label: title,
                }))}
                value={reasonCode}
                onChange={setReasonCode}
              />
              <View className="gap-1.5">
                <Text variant="caption">
                  {reason?.requiresMessage
                    ? "Описание (обязательно)"
                    : "Описание (необязательно)"}
                </Text>
                <TextInput
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Что именно не так"
                />
              </View>
              {asksEmail && (
                <View className="gap-1.5">
                  <Text variant="caption">
                    Email, если хотите получить ответ (необязательно)
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                  />
                  {!emailIsValid && <Text variant="caption">Проверьте адрес</Text>}
                </View>
              )}
              <Button onPress={handleSend} disabled={!canSend}>
                Отправить
              </Button>
            </>
          )}
        </ScreenScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
