// @ts-check
/**
 * Astro integration: fails the build, and so the deploy, if any page can run
 * client-side JavaScript. JSON-LD blocks are data, not scripts, and are
 * allowed.
 */
import { readFile } from 'node:fs/promises';

/** @type {{ pattern: RegExp; reason: string }[]} */
const patterns = [
  {
    pattern: /<script\b(?![^>]*\btype=["']?application\/ld\+json["']?[\s>])[^>]*>/i,
    reason: 'script tag',
  },
  { pattern: /<link\b[^>]*\brel=["']?modulepreload\b/i, reason: 'modulepreload link' },
  { pattern: /<[a-z][^>]*\son[a-z]+\s*=/i, reason: 'event handler attribute' },
  {
    pattern: /\b(?:href|src|action|formaction)\s*=\s*["']?\s*javascript:/i,
    reason: 'javascript: URL',
  },
];

/**
 * @param {string} html
 * @returns {string[]} what was found, empty if the page runs no JavaScript
 */
export const clientScriptsIn = (html) =>
  patterns.filter(({ pattern }) => pattern.test(html)).map(({ reason }) => reason);

/** @type {import('astro').AstroIntegration} */
export const noClientScripts = {
  name: 'no-client-scripts',
  hooks: {
    'astro:build:done': async ({ dir, pages }) => {
      /** @type {string[]} */
      const offenders = [];
      for (const { pathname } of pages) {
        const file = new URL(`${pathname.replace(/\/$/, '') || 'index'}.html`, dir);
        const found = clientScriptsIn(await readFile(file, 'utf8'));
        if (found.length) offenders.push(`/${pathname} (${found.join(', ')})`);
      }
      if (offenders.length) {
        throw new Error(`Client-side JavaScript found on: ${offenders.join('; ')}`);
      }
    },
  },
};
