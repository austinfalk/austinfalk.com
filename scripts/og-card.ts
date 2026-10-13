/// <reference types="bun" />
/**
 * Renders the link-preview card (Open Graph image) to src/assets/austin-falk-og.png:
 * the portrait on the left, the name and roles on the right, in the site's
 * colors and font.
 *
 *   bun run build && bun run og
 *
 * Needs a build first: it embeds the self-hosted Outfit font from dist/.
 * Re-run when the photo, the name or the roles change.
 */

import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { site } from '../src/data/site';

const fontDir = 'dist/_astro/fonts';
const font = readdirSync(fontDir).find((f) => f.endsWith('.woff2'));
if (!font) throw new Error(`No .woff2 in ${fontDir}; run \`bun run build\` first.`);

const base64 = async (path: string) =>
  Buffer.from(await Bun.file(path).arrayBuffer()).toString('base64');

// "Austin Falk | Actor, Creator, M&A Advisor" -> "Actor, Creator, M&A Advisor"
const roles = site.title.split('|')[1]?.trim() ?? '';
const [first, ...rest] = site.name.split(' ');
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Colors are DESIGN.md's tokens: ink, paper, paper-dim.
const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Outfit; font-weight: 100 900;
  src: url(data:font/woff2;base64,${await base64(join(fontDir, font))}) format("woff2"); }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 1200px; height: 630px; overflow: hidden; background: #0c0b09; }
.card { display: grid; grid-template-columns: 460px 1fr; height: 630px; font-family: Outfit, sans-serif; }
.frame { position: relative; overflow: hidden; }
/* Zoomed past "cover" so the face stays recognizable at feed sizes (~500px wide). */
.frame img { position: absolute; height: 860px; left: -6px; top: -40px; }
.text { display: flex; flex-direction: column; justify-content: flex-end; padding: 64px 72px 72px; }
.url { margin-bottom: auto; color: #a39e90; font-size: 24px; }
h1 { color: #ece5d5; font-size: 112px; font-weight: 700; letter-spacing: -0.05em; line-height: 0.88; }
p { margin-top: 30px; color: #ece5d5; font-size: 34px; letter-spacing: -0.01em; }
</style></head><body><div class="card">
<div class="frame"><img src="data:image/jpeg;base64,${await base64('src/assets/austin-falk.jpeg')}" alt=""></div>
<div class="text">
  <span class="url">${new URL(site.url).host}</span>
  <h1>${escape(first)}<br>${escape(rest.join(' '))}</h1>
  <p>${escape(roles)}</p>
</div></div></body></html>`;

const page = join(tmpdir(), 'austinfalk-og-card.html');
await Bun.write(page, html);

const out = 'src/assets/austin-falk-og.png';
const shot = Bun.spawn(['bun', 'scripts/screenshot.ts', `file://${page}`, out, '1200', '630'], {
  stdout: 'inherit',
  stderr: 'inherit',
});
if ((await shot.exited) !== 0) throw new Error('Screenshot failed.');
