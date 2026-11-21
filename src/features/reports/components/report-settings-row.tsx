// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { SettingsRow } from "@/components/ui/settings-row";

import { useOpenReport } from "../report-route";

export function ReportSettingsRow() {
  const openReport = useOpenReport();

  return (
    <SettingsRow
      type="nav"
      icon={{ ios: "exclamationmark.bubble", android: "feedback" }}
      label="Сообщить об ошибке или идее"
      onPress={() => openReport({ type: "app" }, "settings")}
    />
  );
}
