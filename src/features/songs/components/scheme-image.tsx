// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Image } from "expo-image";

import { useSchemeImageSource } from "@/features/lessons";

import { type SongDetailScheme } from "../queries";

type SchemeImageProps = {
  scheme: SongDetailScheme;
  width: number | "100%";
  height: number;
};

export function SchemeImage({ scheme, width, height }: SchemeImageProps) {
  const source = useSchemeImageSource(scheme);
  return <Image source={source} style={{ width, height }} contentFit="contain" />;
}
