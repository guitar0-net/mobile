// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useNetworkState } from "expo-network";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type TextInput as RNTextInput,
  View,
} from "react-native";

import { Button } from "@/components/ui/button";
import { ChipBar } from "@/components/ui/chip-bar";
import { HeaderButton } from "@/components/ui/header-button";
import { ScreenScrollView } from "@/components/ui/screen-scroll-view";
import { Text } from "@/components/ui/text";
import { FieldError, TextInput } from "@/components/ui/text-input";

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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [emailBlurred, setEmailBlurred] = useState(false);
  const messageRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const [sent, setSent] = useState<{ queued: boolean; reasonCode: string } | null>(
    null,
  );

  const reasons = REASONS_BY_TARGET[target.type];
  const reason = reasons.find((candidate) => candidate.code === reasonCode);
  const asksEmail = target.type === "app";
  const trimmedEmail = asksEmail ? email.trim() : "";
  const emailIsValid = trimmedEmail === "" || EMAIL_PATTERN.test(trimmedEmail);
  const messageMissing = reason?.requiresMessage === true && message.trim() === "";
  const hasDraft = !sent && message.trim() !== "";

  const reasonError = submitAttempted && !reason ? "Выберите причину" : undefined;
  const messageError =
    submitAttempted && messageMissing ? "Опишите, что не так" : undefined;
  const emailError =
    (submitAttempted || emailBlurred) && !emailIsValid ? "Проверьте адрес" : undefined;

  function handleSend() {
    setSubmitAttempted(true);
    if (!reason) return;
    if (messageMissing) {
      messageRef.current?.focus();
      return;
    }
    if (!emailIsValid) {
      emailRef.current?.focus();
      return;
    }
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
              <View className="gap-1.5">
                <ChipBar
                  wrap
                  options={reasons.map(({ code, title }) => ({
                    value: code,
                    label: title,
                  }))}
                  value={reasonCode}
                  onChange={setReasonCode}
                />
                {reasonError && <FieldError>{reasonError}</FieldError>}
              </View>
              <View className="gap-1.5">
                <Text variant="caption">
                  {reason?.requiresMessage ? "Описание" : "Описание (необязательно)"}
                </Text>
                <TextInput
                  ref={messageRef}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  maxLength={MAX_MESSAGE_LENGTH}
                  placeholder="Что именно не так"
                  error={messageError}
                />
              </View>
              {asksEmail && (
                <View className="gap-1.5">
                  <Text variant="caption">
                    Email, если хотите получить ответ (необязательно)
                  </Text>
                  <TextInput
                    ref={emailRef}
                    value={email}
                    onChangeText={setEmail}
                    onBlur={() => setEmailBlurred(true)}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    error={emailError}
                  />
                </View>
              )}
              <Button onPress={handleSend}>Отправить</Button>
            </>
          )}
        </ScreenScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
