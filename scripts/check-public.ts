/// <reference types="bun" />
/**
 * Fails if a tracked file breaks the "This repo is public" rules in AGENTS.md:
 * photo metadata (EXIF, XMP: camera, GPS, timestamps), anything shaped like a
 * Cloudflare account or zone ID, or an email address that isn't one the site
 * already publishes.
 *
 *   bun run check:public
 */

import { readFileSync } from 'node:fs';

const publicEmails = new Set(['partnerships@austinfalk.com', 'security@austinfalk.com']);

const files = Bun.spawnSync(['git', 'ls-files', '-z'])
  .stdout.toString()
  .split('\0')
  .filter(Boolean);
const problems: string[] = [];

/** Metadata blocks in a JPEG: APP1 segments holding EXIF or XMP. */
function jpegMetadata(buf: Buffer) {
  const found: string[] = [];
  let i = 2;
  while (i + 4 <= buf.length && buf[i] === 0xff) {
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // image data starts
    const length = buf.readUInt16BE(i + 2);
    const header = buf.subarray(i + 4, i + 4 + 32).toString('latin1');
    if (marker === 0xe1 && header.startsWith('Exif\0')) found.push('EXIF');
    if (marker === 0xe1 && header.startsWith('http://ns.adobe.com/xap/')) found.push('XMP');
    i += 2 + length;
  }
  return found;
}

/** Metadata chunks in a PNG: eXIf, or text chunks carrying EXIF or XMP. */
function pngMetadata(buf: Buffer) {
  const found: string[] = [];
  let i = 8;
  while (i + 8 <= buf.length) {
    const length = buf.readUInt32BE(i);
    const type = buf.subarray(i + 4, i + 8).toString('latin1');
    const keyword = buf.subarray(i + 8, i + 8 + Math.min(length, 80)).toString('latin1');
    if (type === 'eXIf') found.push('EXIF');
    if (['tEXt', 'zTXt', 'iTXt'].includes(type) && /exif|xmp/i.test(keyword.split('\0')[0]))
      found.push(keyword.split('\0')[0]);
    if (type === 'IEND') break;
    i += 12 + length;
  }
  return found;
}

for (const file of files) {
  const buf = readFileSync(file);
  const ext = file.split('.').pop()?.toLowerCase() ?? '';

  if (['jpg', 'jpeg', 'png'].includes(ext)) {
    const found = ext === 'png' ? pngMetadata(buf) : jpegMetadata(buf);
    if (found.length)
      problems.push(
        `${file}: photo metadata (${found.join(', ')}); strip it with magick in.jpg +profile '!icc,*' out.jpg`,
      );
    continue;
  }
  if (['webp', 'avif', 'heic', 'heif', 'gif', 'tif', 'tiff'].includes(ext)) {
    problems.push(`${file}: no metadata check for .${ext}; use JPEG or PNG, or extend this script`);
    continue;
  }
  if (buf.includes(0)) continue; // other binary files (favicon.ico)

  const lines = buf.toString('utf8').split('\n');
  lines.forEach((line, n) => {
    for (const [hex] of line.matchAll(/\b[0-9a-f]{32}\b/gi))
      problems.push(`${file}:${n + 1}: looks like an account or zone ID (${hex.slice(0, 6)}…)`);
    for (const [email] of line.matchAll(/[\w.%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b/gi))
      if (!publicEmails.has(email.toLowerCase()))
        problems.push(`${file}:${n + 1}: email address ${email} isn't one the site publishes`);
  });
}

for (const problem of problems) console.log(`FAIL ${problem}`);
console.log(
  problems.length
    ? `\n${problems.length} problem(s); see "This repo is public" in AGENTS.md`
    : `ok   ${files.length} tracked files: no photo metadata, IDs or private emails`,
);
process.exit(problems.length ? 1 : 0);
