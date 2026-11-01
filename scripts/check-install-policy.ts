/// <reference types="bun" />
/**
 * Fails if the install drifts from what package.json and bunfig.toml promise:
 * - bunfig.toml keeps the release-age gate with no exemptions committed.
 * - `@astrojs/markdown-satteri` resolves once. Astro pins it exactly, so the
 *   root pin must match Astro's or the lockfile carries two copies.
 *
 *   bun run check:install
 */

import { readFileSync } from 'node:fs';

const problems: string[] = [];

const bunfig = readFileSync('bunfig.toml', 'utf8');
if (!/^minimumReleaseAge\s*=\s*\d+/m.test(bunfig)) {
  problems.push('bunfig.toml has no minimumReleaseAge');
}
if (/^minimumReleaseAgeExcludes/m.test(bunfig)) {
  problems.push('bunfig.toml commits minimumReleaseAgeExcludes');
}

const satteri = '@astrojs/markdown-satteri';
const lock = Bun.JSONC.parse(readFileSync('bun.lock', 'utf8')) as {
  packages: Record<string, [string, ...unknown[]]>;
};
const copies = Object.entries(lock.packages)
  .filter(([key]) => key === satteri || key.endsWith(`/${satteri}`))
  .map(([, [id]]) => id);
if (copies.length !== 1) problems.push(`${satteri} resolves ${copies.length} times: ${copies}`);

for (const problem of problems) console.log(`FAIL ${problem}`);
console.log(problems.length ? `\n${problems.length} problem(s)` : 'ok   install policy');
process.exit(problems.length ? 1 : 0);
