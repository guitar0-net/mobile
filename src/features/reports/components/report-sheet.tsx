// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useNetworkState } from "expo-network";
import { useSegments } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { ChipBar } from "@/components/ui/chip-bar";
import { Sheet, SheetTextInput } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";

import { submitReport } from "../queue";
import type { ReportSource, ReportTarget } from "../queue";
import { REASONS_BY_TARGET } from "../reasons";
import { readContactEmail, saveContactEmail } from "../storage";
import { ReportSuccess } from "./report-success";

const MAX_MESSAGE_LENGTH = 2000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TITLES: Record<ReportTarget["type"], string> = {
  song: "Что не так с песней?",
  lesson: "Что не так с уроком?",
  app: "Ошибка или идея?",
};

type Props = {
  visible: boolean;
  onClose: () => void;
  target: ReportTarget;
  source: ReportSource;
};

export function ReportSheet({ visible, onClose, target, source }: Props) {
  return (
    <Sheet modal visible={visible} onClose={onClose}>
      <ReportForm target={target} source={source} onDone={onClose} />
    </Sheet>
  );
}

type FormProps = {
  target: ReportTarget;
  source: ReportSource;
  onDone: () => void;
};

function ReportForm({ target, source, onDone }: FormProps) {
  const segments = useSegments();
  const network = useNetworkState();
  const [reasonCode, setReasonCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(readContactEmail);
  const [sent, setSent] = useState<{ queued: boolean } | null>(null);

  const reasons = REASONS_BY_TARGET[target.type];
  const reason = reasons.find((candidate) => candidate.code === reasonCode);
  const asksEmail = target.type === "app";
  const trimmedEmail = asksEmail ? email.trim() : "";
  const emailIsValid = trimmedEmail === "" || EMAIL_PATTERN.test(trimmedEmail);
  const canSend =
    reason !== undefined &&
    (!reason.requiresMessage || message.trim() !== "") &&
    emailIsValid;

  if (sent) return <ReportSuccess queued={sent.queued} onDone={onDone} />;

  function handleSend() {
    if (!reason) return;
    const queued = network.isInternetReachable === false;
    submitReport(
      {
        target,
        reason: reason.code,
        message: message.trim(),
        contactEmail: trimmedEmail || undefined,
        screen: `/${segments.join("/")}`,
        source,
      },
      { offline: queued },
    );
    if (asksEmail) saveContactEmail(trimmedEmail);
    setSent({ queued });
  }

  return (
    <View className="gap-4 px-5 pb-4 pt-2">
      <Text variant="heading">{TITLES[target.type]}</Text>
      <ChipBar
        wrap
        options={reasons.map(({ code, title }) => ({ value: code, label: title }))}
        value={reasonCode}
        onChange={setReasonCode}
      />
      <View className="gap-1.5">
        <Text variant="caption">
          {reason?.requiresMessage
            ? "Описание (обязательно)"
            : "Описание (необязательно)"}
        </Text>
        <SheetTextInput
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
          <SheetTextInput
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
    </View>
  );
}
