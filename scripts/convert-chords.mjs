// SPDX-FileCopyrightText: 2026 Andrey Kotlyar <guitar0.app@gmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SNAPSHOT_PATH = fileURLToPath(
  new URL("../assets/content/lessons.snapshot", import.meta.url),
);

// Chord lines were aligned by eye in an unknown proportional font, so a chord's position
// is averaged across these fonts and then snapped to a syllable start.
const FONTS = [
  {
    name: "Arial",
    regular: "/System/Library/Fonts/Supplemental/Arial.ttf",
    bold: "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  },
  {
    name: "Geist",
    regular: fileURLToPath(
      new URL("../assets/fonts/Geist-Regular.ttf", import.meta.url),
    ),
    bold: fileURLToPath(new URL("../assets/fonts/Geist-SemiBold.ttf", import.meta.url)),
  },
];

const IDEOGRAPHIC_SPACE = "\u3000";
const NBSP = "\u00a0";
const CHORD_RE =
  /^[A-HАСН](#|b)?(m|maj|min|dim|aug|sus\d?|add\d+)?\d*#?(\/[A-HАСН][#b]?)?( ?-?\(.*\))?$/;
const CHORD_LINE_RE = /^\*\*(.*?)\*\*(\s*)$/;
const VOWEL_RE = /[аеёиоуыэюяaeiouy]/i;
const LETTER_RE = /[\p{L}]/u;
const SONORANT_RE = /[лрмн]/i;
const SIGN_RE = /[ьъ]/i;

function loadFont(path) {
  const buf = readFileSync(path);
  const tables = new Map();
  const numTables = buf.readUInt16BE(4);
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    tables.set(buf.toString("latin1", rec, rec + 4), buf.readUInt32BE(rec + 8));
  }
  const unitsPerEm = buf.readUInt16BE(tables.get("head") + 18);
  const numberOfHMetrics = buf.readUInt16BE(tables.get("hhea") + 34);
  const hmtx = tables.get("hmtx");
  const advance = (glyph) =>
    buf.readUInt16BE(hmtx + 4 * Math.min(glyph, numberOfHMetrics - 1));

  const cmap = tables.get("cmap");
  let subtable;
  for (let i = 0; i < buf.readUInt16BE(cmap + 2); i++) {
    const rec = cmap + 4 + i * 8;
    if (buf.readUInt16BE(rec) === 3 && buf.readUInt16BE(rec + 2) === 1) {
      subtable = cmap + buf.readUInt32BE(rec + 4);
    }
  }
  if (subtable === undefined || buf.readUInt16BE(subtable) !== 4) {
    throw new Error(`${path}: no Unicode BMP cmap (format 4)`);
  }
  const segCount = buf.readUInt16BE(subtable + 6) / 2;
  const endCodes = subtable + 14;
  const startCodes = endCodes + segCount * 2 + 2;
  const idDeltas = startCodes + segCount * 2;
  const idRangeOffsets = idDeltas + segCount * 2;

  const glyphOf = (code) => {
    for (let s = 0; s < segCount; s++) {
      if (code > buf.readUInt16BE(endCodes + s * 2)) continue;
      const start = buf.readUInt16BE(startCodes + s * 2);
      if (code < start) return 0;
      const delta = buf.readInt16BE(idDeltas + s * 2);
      const rangeOffsetPos = idRangeOffsets + s * 2;
      const rangeOffset = buf.readUInt16BE(rangeOffsetPos);
      if (rangeOffset === 0) return (code + delta) & 0xffff;
      const glyph = buf.readUInt16BE(rangeOffsetPos + rangeOffset + 2 * (code - start));
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };

  const cache = new Map();
  return (char) => {
    if (char === IDEOGRAPHIC_SPACE) return 1;
    let width = cache.get(char);
    if (width === undefined) {
      const glyph = glyphOf(char.codePointAt(0)) || glyphOf(char === NBSP ? 0x20 : 0);
      width = glyph === 0 ? 0.5 : advance(glyph) / unitsPerEm;
      cache.set(char, width);
    }
    return width;
  };
}

function charOffsets(text, widthOf) {
  const offsets = [0];
  for (const char of text) offsets.push(offsets.at(-1) + widthOf(char));
  return offsets;
}

function tokenizeChordLine(inner) {
  const chars = [...inner];
  const tokens = [];
  let i = 0;
  while (i < chars.length) {
    if (/\s/.test(chars[i])) {
      i++;
      continue;
    }
    const start = i;
    let depth = 0;
    while (i < chars.length) {
      const c = chars[i];
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (depth <= 0 && /\s/.test(c)) {
        let j = i;
        while (j < chars.length && chars[j] === " ") j++;
        if (chars[j] !== "(") break;
        i = j;
        continue;
      }
      i++;
    }
    tokens.push({ index: start, text: chars.slice(start, i).join("") });
  }
  return tokens;
}

function fractionalIndex(offsets, x) {
  const last = offsets.length - 1;
  if (x >= offsets[last]) return last + 1;
  let i = 0;
  while (offsets[i + 1] <= x) i++;
  return i + (x - offsets[i]) / (offsets[i + 1] - offsets[i]);
}

function anchorAt(chars, position) {
  if (position >= chars.length - 0.3) return chars.length;
  let anchor = Math.max(0, Math.round(position));
  while (anchor < chars.length && !LETTER_RE.test(chars[anchor])) anchor++;
  return snapToSyllable(chars, anchor);
}

function nextSyllable(chars, from) {
  for (let i = from + 1; i < chars.length; i++) {
    if (LETTER_RE.test(chars[i]) && snapToSyllable(chars, i) === i) return i;
  }
  return chars.length;
}

function snapToSyllable(chars, anchor) {
  if (anchor >= chars.length || !LETTER_RE.test(chars[anchor])) return anchor;
  let wordStart = anchor;
  while (wordStart > 0 && LETTER_RE.test(chars[wordStart - 1])) wordStart--;
  let wordEnd = anchor;
  while (wordEnd < chars.length && LETTER_RE.test(chars[wordEnd])) wordEnd++;

  let vowel = -1;
  for (let d = 0; d < wordEnd - wordStart; d++) {
    if (anchor + d < wordEnd && VOWEL_RE.test(chars[anchor + d])) {
      vowel = anchor + d;
      break;
    }
    if (anchor - d >= wordStart && VOWEL_RE.test(chars[anchor - d])) {
      vowel = anchor - d;
      break;
    }
  }
  if (vowel === -1) return wordStart;
  for (let i = vowel - 1; i >= wordStart; i--) {
    if (VOWEL_RE.test(chars[i])) return codaEnd(chars, i + 1, vowel);
  }
  return wordStart;
}

function codaEnd(chars, start, nextVowel) {
  const isConsonant = (c) => LETTER_RE.test(c) && !VOWEL_RE.test(c) && !SIGN_RE.test(c);
  let end = start;
  if (/[йj]/i.test(chars[end])) {
    end++;
  } else if (SONORANT_RE.test(chars[end])) {
    const after = SIGN_RE.test(chars[end + 1]) ? end + 2 : end + 1;
    if (after < nextVowel && isConsonant(chars[after])) end = after;
  }
  if (SIGN_RE.test(chars[end]) && end < nextVowel) end++;
  return Math.min(end, nextVowel);
}

function convertPair(chordInner, lyric, fonts) {
  const inner = chordInner.replaceAll("&nbsp;", NBSP);
  const tokens = tokenizeChordLine(inner);
  if (tokens.length === 0) return { issues: ["нет аккордов"] };
  const bad = tokens.filter((t) => !CHORD_RE.test(t.text));
  if (bad.length > 0) {
    return { issues: [`не аккорд: ${bad.map((t) => t.text).join(", ")}`] };
  }

  const chars = [...lyric];
  const positions = tokens.map(() => 0);
  for (const font of fonts) {
    const chordOffsets = charOffsets(inner, font.bold);
    const lyricOffsets = charOffsets(lyric, font.regular);
    tokens.forEach((t, k) => {
      positions[k] +=
        fractionalIndex(lyricOffsets, chordOffsets[t.index]) / fonts.length;
    });
  }

  const issues = [];
  const anchors = [];
  tokens.forEach((t, k) => {
    let anchor = anchorAt(chars, positions[k]);
    const previous = anchors[k - 1];
    if (previous !== undefined && previous < chars.length && anchor <= previous) {
      anchor = nextSyllable(chars, previous);
      issues.push(`сдвинут на следующий слог: ${t.text}`);
    }
    anchors.push(anchor);
  });

  let line = "";
  let cursor = 0;
  tokens.forEach((t, k) => {
    const at = Math.max(anchors[k], cursor);
    line += chars.slice(cursor, at).join("");
    if (at === chars.length) line += " ";
    line += `[${t.text}]`;
    cursor = at;
  });
  line += chars.slice(cursor).join("");

  return { line: line.replace(/[\s 　]+/g, " ").trim(), issues };
}

function isLyricLine(line) {
  const trimmed = line.trim();
  return trimmed !== "" && !/^(#|\*\*|>|-|\|)/.test(trimmed);
}

function looksLikeChordLine(line) {
  if (!line.startsWith("**")) return false;
  if (line.includes(IDEOGRAPHIC_SPACE) || line.startsWith("**&nbsp;")) return true;
  const match = CHORD_LINE_RE.exec(line);
  if (!match) return false;
  const tokens = tokenizeChordLine(match[1]);
  return tokens.length > 0 && tokens.every((t) => CHORD_RE.test(t.text));
}

function convertSong(text, fonts) {
  const lines = text.split("\r\n");
  const out = [];
  const pairs = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = CHORD_LINE_RE.exec(line);
    if (!looksLikeChordLine(line)) {
      out.push(line);
      continue;
    }
    const lyricIndex = lines[i + 1]?.trim() === "" ? i + 2 : i + 1;
    const next = lines[lyricIndex];
    if (!match || next === undefined || !isLyricLine(next)) {
      out.push(line);
      if (!match) pairs.push({ chordLine: line, issues: ["строка не распознана"] });
      continue;
    }
    const lyricMatch = /^(.*?)(\s*)$/.exec(next);
    const lyric = lyricMatch[1].replaceAll("&nbsp;", NBSP);
    const result = convertPair(match[1], lyric, fonts);
    pairs.push({ chordLine: line, lyric, ...result });
    if (result.line === undefined) {
      out.push(line);
      continue;
    }
    out.push(result.line + lyricMatch[2]);
    i = lyricIndex;
  }
  return { text: out.join("\r\n"), pairs };
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSegments(line) {
  const parts = line.split(/(\[[^\]]*\])/);
  const words = [];
  let chord = null;
  for (const part of parts) {
    if (part.startsWith("[") && part.endsWith("]")) {
      if (chord !== null) words.push({ chord, text: "" });
      chord = part.slice(1, -1);
      continue;
    }
    const pieces = part.split(/(?<= )/);
    pieces.forEach((piece, n) => {
      if (piece === "") return;
      words.push({ chord: n === 0 ? chord : null, text: piece, glue: n === 0 });
      if (n === 0) chord = null;
    });
  }
  if (chord !== null) words.push({ chord, text: "" });
  return words
    .map(
      (w) =>
        `<span class="seg"><b>${w.chord === null ? "&nbsp;" : escapeHtml(w.chord)}</b><span>${escapeHtml(w.text).replaceAll(" ", "&nbsp;") || "&nbsp;"}</span></span>`,
    )
    .join("");
}

function renderReport(songs, fonts) {
  const flagged = songs.flatMap((s) =>
    s.pairs.filter((p) => p.issues.length > 0).map((p) => ({ song: s, pair: p })),
  );
  const total = songs.reduce((n, s) => n + s.pairs.length, 0);
  const converted = songs.reduce((n, s) => n + s.pairs.filter((p) => p.line).length, 0);

  const pairHtml = (p) => {
    const original = `<div class="orig"><b>${escapeHtml(p.chordLine.replace(/^\*\*|\*\*\s*$/g, "").replaceAll("&nbsp;", NBSP))}</b>${p.lyric === undefined ? "" : `<br>${escapeHtml(p.lyric)}`}</div>`;
    const result = p.line
      ? `<div class="res"><code>${escapeHtml(p.line)}</code><div class="segs">${renderSegments(p.line)}</div></div>`
      : `<div class="res"><em>оставлено как есть</em></div>`;
    const issues = p.issues.length
      ? `<div class="issues">${p.issues.map(escapeHtml).join("<br>")}</div>`
      : "";
    return `<div class="pair${p.issues.length ? " flagged" : ""}">${original}${result}${issues}</div>`;
  };

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Конвертация аккордов</title>
<style>
body{font:16px/1.4 Arial,sans-serif;margin:16px;max-width:1100px;background:#fff;color:#111}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:8px 0;border-bottom:1px solid #eee}
.flagged{background:#fff4e5}
.orig{white-space:pre}
.res code{font-size:12px;color:#555;white-space:pre-wrap}
.segs{display:flex;flex-wrap:wrap;margin-top:4px}
.seg{display:inline-flex;flex-direction:column;padding-right:2px}
.seg b{color:#b00}
.issues{grid-column:1/-1;color:#b45309;font-size:13px}
h2{margin-top:32px}
</style></head><body>
<h1>Конвертация аккордов</h1>
<p>Пар «аккорды + текст»: ${total}, сконвертировано: ${converted}, требуют внимания: ${flagged.length}. Позиция аккорда усреднена по шрифтам: ${fonts.map((f) => f.name).join(", ")}.</p>
<p>Слева — как было (шрифт Arial), справа — результат и раскладка кусками, как в будущем приложении.</p>
<h2>Требуют внимания</h2>
${flagged.map(({ song, pair }) => `<h3><a href="#${song.uuid}">${escapeHtml(song.title)}</a></h3>${pairHtml(pair)}`).join("\n")}
<h2>Все песни</h2>
${songs.map((s) => `<h2 id="${s.uuid}">${escapeHtml(s.title)}</h2>${s.pairs.map(pairHtml).join("\n")}`).join("\n")}
</body></html>`;
}

function main() {
  const [outDir, filter] = process.argv.slice(2);
  if (!outDir) {
    console.error("usage: node scripts/convert-chords.mjs <out-dir> [title-filter]");
    process.exit(1);
  }
  const fonts = FONTS.filter((f) => existsSync(f.regular) && existsSync(f.bold)).map(
    (f) => ({
      name: f.name,
      regular: loadFont(f.regular),
      bold: loadFont(f.bold),
    }),
  );
  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
  const songs = snapshot.songs
    .filter(
      (s) =>
        s.text && (!filter || s.title.toLowerCase().includes(filter.toLowerCase())),
    )
    .map((s) => ({
      uuid: s.uuid,
      title: s.title,
      sourceSha256: createHash("sha256").update(s.text, "utf8").digest("hex"),
      ...convertSong(s.text, fonts),
    }));

  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "converted.json"),
    JSON.stringify(
      Object.fromEntries(
        songs.map((s) => [
          s.uuid,
          { source_sha256: s.sourceSha256, chord_text: s.text },
        ]),
      ),
      null,
      2,
    ),
  );
  writeFileSync(join(outDir, "report.html"), renderReport(songs, fonts));

  const flagged = songs.reduce(
    (n, s) => n + s.pairs.filter((p) => p.issues.length).length,
    0,
  );
  console.log(`songs: ${songs.length}, flagged pairs: ${flagged}, out: ${outDir}`);
}

main();
