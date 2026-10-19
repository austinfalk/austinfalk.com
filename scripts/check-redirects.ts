/// <reference types="bun" />
/**
 * Checks every redirect, status code and key header against a running site.
 *
 *   bun run test:redirects                     # builds nothing; starts `wrangler dev` on dist/
 *   bun run test:redirects https://example.com # checks a deployed URL instead
 *
 * Run `bun run build` first when testing locally. Exits non-zero on failure.
 */

import { readFileSync } from 'node:fs';

type Case = { path: string; status: number; location?: string };

const cases: Case[] = [
  // Pages
  { path: '/', status: 200 },
  { path: '/about', status: 200 },
  { path: '/robots.txt', status: 200 },
  { path: '/sitemap-index.xml', status: 200 },
  { path: '/llms.txt', status: 200 },
  { path: '/.well-known/security.txt', status: 200 },
  { path: '/index.md', status: 200 },
  { path: '/about.md', status: 200 },
  { path: '/favicon.ico', status: 200 },
  { path: '/apple-touch-icon.png', status: 200 },
  { path: '/site.webmanifest', status: 200 },
  // No trailing slashes; query strings survive
  { path: '/about/', status: 301, location: '/about' },
  { path: '/about/?ref=x', status: 301, location: '/about?ref=x' },
  // Old WordPress pages
  { path: '/portfolio', status: 301, location: '/about#movies-and-tv-shows' },
  { path: '/portfolio/', status: 301, location: '/about#movies-and-tv-shows' },
  { path: '/contact', status: 301, location: '/' },
  { path: '/contact/', status: 301, location: '/' },
  { path: '/sitemap.xml', status: 301, location: '/sitemap-index.xml' },
  { path: '/security.txt', status: 301, location: '/.well-known/security.txt' },
  // Legacy WordPress endpoints
  { path: '/feed', status: 301, location: '/' },
  { path: '/feed/', status: 301, location: '/' },
  { path: '/wp-admin', status: 301, location: '/' },
  { path: '/wp-admin/', status: 301, location: '/' },
  { path: '/wp-admin/edit.php', status: 301, location: '/' },
  { path: '/wp-login.php', status: 301, location: '/' },
  { path: '/xmlrpc.php', status: 301, location: '/' },
  // Missing pages are real 404s
  { path: '/does-not-exist', status: 404 },
];

const headerChecks: { path: string; header: string; includes: string }[] = [
  { path: '/', header: 'cache-control', includes: 'must-revalidate' },
  { path: '/favicon.ico', header: 'cache-control', includes: 'max-age=86400' },
  { path: '/apple-touch-icon.png', header: 'cache-control', includes: 'max-age=86400' },
  { path: '/icon-512.png', header: 'cache-control', includes: 'max-age=86400' },
  { path: '/site.webmanifest', header: 'cache-control', includes: 'max-age=86400' },
  { path: '/index.md', header: 'content-type', includes: 'text/markdown; charset=utf-8' },
  { path: '/about.md', header: 'content-type', includes: 'text/markdown; charset=utf-8' },
  { path: '/llms.txt', header: 'content-type', includes: 'text/plain; charset=utf-8' },
  { path: '/robots.txt', header: 'content-type', includes: 'text/plain; charset=utf-8' },
  {
    path: '/.well-known/security.txt',
    header: 'content-type',
    includes: 'text/plain; charset=utf-8',
  },
  { path: '/index.md', header: 'link', includes: '<https://austinfalk.com/>; rel="canonical"' },
  {
    path: '/about.md',
    header: 'link',
    includes: '<https://austinfalk.com/about>; rel="canonical"',
  },
];

// Every header in the catch-all `/*` block of public/_headers, checked for its
// exact value on each kind of response, so the test can't drift from the file.
const sitewideHeaders = (() => {
  const lines = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8').split('\n');
  const start = lines.indexOf('/*');
  const headers: [string, string][] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) break;
    const match = line.match(/^\s+([\w-]+):\s*(.+)$/);
    if (match) headers.push([match[1].toLowerCase(), match[2]]);
  }
  if (start === -1 || !headers.length) throw new Error('No `/*` block in public/_headers');
  return headers;
})();
const sitewidePaths = ['/', '/about', '/about.md', '/llms.txt', '/does-not-exist', '/about/'];

let base = process.argv[2];
let server: ReturnType<typeof Bun.spawn> | undefined;

if (!base) {
  const port = 8800 + Math.floor(Math.random() * 100);
  base = `http://127.0.0.1:${port}`;
  server = Bun.spawn(
    ['./node_modules/.bin/wrangler', 'dev', '--port', String(port), '--ip', '127.0.0.1'],
    {
      stdout: 'ignore',
      stderr: 'ignore',
    },
  );
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(base, { redirect: 'manual' });
      break;
    } catch {
      await Bun.sleep(250);
    }
  }
}

let failures = 0;
const origin = new URL(base).origin;

for (const c of cases) {
  const res = await fetch(base + c.path, { redirect: 'manual' });
  const raw = res.headers.get('location');
  const location = raw ? raw.replace(origin, '') : undefined;
  const ok = res.status === c.status && (c.location === undefined || location === c.location);
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${c.path.padEnd(22)} ${res.status}${location ? ` -> ${location}` : ''}` +
      (ok ? '' : `   (expected ${c.status}${c.location ? ` -> ${c.location}` : ''})`),
  );
}

for (const h of headerChecks) {
  const res = await fetch(base + h.path, { redirect: 'manual' });
  // With the custom domain in wrangler.jsonc, wrangler dev rewrites
  // https://austinfalk.com in response headers to its own local origin.
  const value = (res.headers.get(h.header) ?? '').replaceAll(origin, 'https://austinfalk.com');
  const ok = value.includes(h.includes);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${h.path} ${h.header}: ${value || '(missing)'}`);
}

for (const path of sitewidePaths) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const wrong = sitewideHeaders.filter(([name, value]) => res.headers.get(name) !== value);
  if (wrong.length) failures++;
  console.log(
    `${wrong.length ? 'FAIL' : 'ok  '} ${path} ${res.status}: ${sitewideHeaders.length} site-wide headers` +
      wrong.map(([name]) => `\n       ${name}: ${res.headers.get(name) ?? '(missing)'}`).join(''),
  );
}

// A missing URL serves the designed 404 page, not just the status. Worker
// Previews (non-main branches) serve Cloudflare's plain "Not found" instead,
// a platform limitation, so the check is skipped there.
{
  const host = new URL(base).hostname;
  const branchPreview = host.endsWith('.workers.dev') && host.split('.')[0] !== 'austinfalk-com';
  const body = await (await fetch(base + '/does-not-exist', { redirect: 'manual' })).text();
  const ok = branchPreview || body.includes('<title>Not found');
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} /does-not-exist body: ${branchPreview ? 'skipped (Worker Preview)' : body.includes('<title>Not found') ? 'designed 404 page' : body.slice(0, 40)}`,
  );
}

// security.txt must not be expired (RFC 9116); renew Expires before then.
{
  const text = await (await fetch(base + '/.well-known/security.txt')).text();
  const expires = text.match(/^Expires: (.+)$/m)?.[1];
  const ok = !!expires && new Date(expires).getTime() > Date.now();
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} /.well-known/security.txt Expires: ${expires ?? '(missing)'}`,
  );
}

// On the live domain, also check the redirects that happen before the site:
// http -> https and www -> apex (Cloudflare edge rules, not _redirects).
// http://www goes straight to the apex in one hop, not via https://www.
if (new URL(base).hostname === 'austinfalk.com') {
  const edge: [string, string][] = [
    ['http://austinfalk.com/', 'https://austinfalk.com/'],
    ['http://www.austinfalk.com/about?x=1', 'https://austinfalk.com/about?x=1'],
    ['https://www.austinfalk.com/', 'https://austinfalk.com/'],
    ['https://www.austinfalk.com/about?x=1', 'https://austinfalk.com/about?x=1'],
  ];
  for (const [from, to] of edge) {
    const res = await fetch(from, { redirect: 'manual' });
    const ok = res.status === 301 && res.headers.get('location') === to;
    if (!ok) failures++;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${from} ${res.status} -> ${res.headers.get('location')}` +
        (ok ? '' : `   (expected 301 -> ${to})`),
    );
  }
}

// The workers.dev preview is noindex; every other host must not be.
{
  const preview = new URL(base).hostname.endsWith('.workers.dev');
  const value = (await fetch(base + '/', { redirect: 'manual' })).headers.get('x-robots-tag') ?? '';
  const ok = preview ? value.includes('noindex') : !value.includes('noindex');
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} / x-robots-tag: ${value || '(none)'}${preview ? ' (preview)' : ''}`,
  );
}

server?.kill();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
