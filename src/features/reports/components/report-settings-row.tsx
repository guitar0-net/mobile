// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useState } from "react";

import { SettingsRow } from "@/components/ui/settings-row";

import { ReportSheet } from "./report-sheet";

export function ReportSettingsRow() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SettingsRow
        type="nav"
        icon={{ ios: "exclamationmark.bubble", android: "feedback" }}
        label="Сообщить об ошибке или идее"
        onPress={() => setOpen(true)}
      />
      <ReportSheet
        visible={open}
        onClose={() => setOpen(false)}
        target={{ type: "app" }}
        source="settings"
      />
    </>
  );
}
