// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import { apiPostBinary } from "@/lib/network";

import type { PrintSettingsData } from "./print-settings-store";

export async function printSong(
  uuid: string,
  params: PrintSettingsData,
): Promise<void> {
  const { data, filename } = await apiPostBinary(`/api/v1/songs/${uuid}/print/`, {
    show_chords: params.showChords,
    show_schemes: params.showSchemes,
    show_text: params.showText,
    chord_orientation: params.chordOrientation,
    chord_size: params.chordSize,
    scheme_size: params.schemeSize,
    text_size: params.textSize,
    columns_count: params.columnsCount,
  });

  const file = new FileSystem.File(
    FileSystem.Paths.cache,
    filename ?? `song-${uuid}.pdf`,
  );
  file.write(new Uint8Array(data));
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  } finally {
    file.delete();
  }
}
