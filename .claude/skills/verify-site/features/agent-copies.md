# Agent-readable copies

Search engines and AI assistants read the site through plain-text copies:
Markdown versions of both pages (canonical back to the HTML), `llms.txt` as
a map, `robots.txt` with content signals, the sitemap, and `security.txt`.
Each HTML page advertises its Markdown copy with `<link rel="alternate">`.

## Sub-features

- `md-home` serves `/index.md` as `text/markdown` with a canonical `Link` header to `https://austinfalk.com/`.
- `md-about` serves `/about.md` the same way, canonical to `https://austinfalk.com/about`.
- `md-alternate` links each HTML page to its Markdown copy.
- `llms` serves `/llms.txt` as `text/plain` and links both Markdown copies.
- `robots` allows all crawlers and points at the sitemap and `llms.txt`.
- `sitemap` lists `/` and `/about` from `/sitemap-index.xml`.
- `security` serves `/.well-known/security.txt` with a future `Expires`.

## How to get to it (user POV)

- An agent follows `rel="alternate"` from a page, or requests `/index.md` or `/about.md`.
- A crawler reads `/robots.txt`, then `/sitemap-index.xml` and `/llms.txt`.
- A security researcher opens `/.well-known/security.txt` (or the old `/security.txt`).

## Driving it with site.ts

Preconditions:

- A run is up and `bun $S doctor` exits 0.

- **Alternate link.** Run `bun $S goto /` and `bun $S eval '[...document.querySelectorAll("link[rel=alternate],link[rel=canonical]")].map(l => l.rel + " " + l.getAttribute("href"))'`. It prints `canonical https://austinfalk.com/` and `alternate /index.md`. On `/about` it prints `canonical https://austinfalk.com/about` and `alternate /about.md`.
- **Home copy.** Run `bun $S fetch /index.md --as md-home`. Status `200`, `content-type` `text/markdown; charset=utf-8`, `link` `<https://austinfalk.com/>; rel="canonical"`, and the body starts `# Austin Falk`.
- **About copy.** Run `bun $S fetch /about.md --as md-about`. Status `200`, `link` `<https://austinfalk.com/about>; rel="canonical"`, and the body has the same section headings as the page.
- **llms.txt.** Run `bun $S fetch /llms.txt --as llms`. Status `200`, `content-type` `text/plain`, and the body lists `https://austinfalk.com/index.md` and `https://austinfalk.com/about.md`.
- **robots.txt.** Run `bun $S fetch /robots.txt`. The body has `Allow: /`, `Content-Signal: search=yes, ai-input=yes, ai-train=yes` and `Sitemap: https://austinfalk.com/sitemap-index.xml`.
- **Sitemap.** Run `bun $S fetch /sitemap-index.xml`, then `bun $S fetch /sitemap-0.xml --as sitemap`. The second lists `https://austinfalk.com/` and `https://austinfalk.com/about`, and `/about` carries a `lastmod`.
- **security.txt.** Run `bun $S fetch /.well-known/security.txt --as security`. Status `200` and the `Expires:` date is in the future. Run `bun $S fetch /security.txt`. Status `301` to `/.well-known/security.txt`.

## Gotchas

- `wrangler dev` rewrites `https://austinfalk.com` in response headers to its
  own origin. `fetch` maps it back, so expect production URLs in its output.
- The Markdown copies are generated from the same content files as the pages.
  A copy that disagrees with its page means a build issue, not a copy edit.
- The home page has no sitemap `lastmod` on purpose (a build date would claim
  it changes on every deploy).
- `security.txt` expires. `test:redirects` fails once `Expires` passes, so
  renew it before then.
