/// <reference types="bun" />
/**
 * Checks every redirect, status code and key header against a running site.
 *
 *   bun run test:redirects                     # builds nothing; starts `wrangler dev` on dist/
 *   bun run test:redirects https://example.com # checks a deployed URL instead
 *
 * Run `bun run build` first when testing locally. Exits non-zero on failure.
 */

export {};

type Case = { path: string; status: number; location?: string };

const cases: Case[] = [
  // Pages
  { path: '/', status: 200 },
  { path: '/about', status: 200 },
  { path: '/robots.txt', status: 200 },
  { path: '/sitemap-index.xml', status: 200 },
  { path: '/llms.txt', status: 200 },
  { path: '/index.md', status: 200 },
  { path: '/about.md', status: 200 },
  { path: '/favicon.ico', status: 200 },
  { path: '/apple-touch-icon.png', status: 200 },
  { path: '/site.webmanifest', status: 200 },
  // No trailing slashes; query strings survive
  { path: '/about/', status: 301, location: '/about' },
  { path: '/about/?ref=x', status: 301, location: '/about?ref=x' },
  // Old WordPress pages
  { path: '/portfolio', status: 301, location: '/about' },
  { path: '/portfolio/', status: 301, location: '/about' },
  { path: '/contact', status: 301, location: '/' },
  { path: '/contact/', status: 301, location: '/' },
  { path: '/sitemap.xml', status: 301, location: '/sitemap-index.xml' },
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
  { path: '/', header: 'content-security-policy', includes: "default-src 'self'" },
  { path: '/', header: 'x-content-type-options', includes: 'nosniff' },
  { path: '/', header: 'cache-control', includes: 'must-revalidate' },
  { path: '/index.md', header: 'content-type', includes: 'text/markdown' },
  { path: '/llms.txt', header: 'content-type', includes: 'text/plain' },
];

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
  const value = res.headers.get(h.header) ?? '';
  const ok = value.includes(h.includes);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${h.path} ${h.header}: ${value || '(missing)'}`);
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
