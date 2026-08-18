// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";

import { makeDotLottie } from "@dotlottie/dotlottie-js";

const ANIMATIONS_DIR = new URL("../assets/animations/", import.meta.url).pathname;

function toKebabCase(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

function isImageAsset(asset) {
  return (
    "w" in asset &&
    "h" in asset &&
    "p" in asset &&
    !("xt" in asset) &&
    typeof asset.u === "string" &&
    !asset.p.startsWith("data:")
  );
}

function embedImages(animationData) {
  for (const asset of animationData.assets ?? []) {
    if (!isImageAsset(asset)) continue;

    const imagePath = join(ANIMATIONS_DIR, asset.u, asset.p);
    const buffer = readFileSync(imagePath);
    const ext = extname(asset.p).slice(1) || "png";

    asset.p = `data:image/${ext};base64,${buffer.toString("base64")}`;
    asset.u = "";
    asset.e = 1;
  }

  return animationData;
}

async function buildAnimation(fileName) {
  const id = toKebabCase(fileName.replace(/\.json$/, ""));
  const raw = JSON.parse(readFileSync(join(ANIMATIONS_DIR, fileName), "utf8"));
  const data = embedImages(raw);

  const dotLottie = makeDotLottie("v1");
  dotLottie.addAnimation({ id, data, loop: true, autoplay: true });
  await dotLottie.build();

  const arrayBuffer = await dotLottie.toArrayBuffer();
  const outPath = join(ANIMATIONS_DIR, `${id}.lottie`);
  writeFileSync(outPath, Buffer.from(arrayBuffer));

  console.log(`Built ${outPath}`);
}

async function main() {
  const jsonFiles = readdirSync(ANIMATIONS_DIR).filter((file) =>
    file.endsWith(".json"),
  );

  if (jsonFiles.length === 0) {
    console.log("No raw .json animations found in assets/animations/.");
    return;
  }

  for (const file of jsonFiles) {
    await buildAnimation(file);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
