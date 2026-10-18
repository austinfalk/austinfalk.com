# Redirects and not found

Old WordPress URLs and trailing-slash URLs send visitors to the right page
with one permanent redirect, keeping the query string. Anything else that
doesn't exist shows the designed `Cut.` page with a real 404 status and a
`Back to the start` link.

## Sub-features

- `redir-legacy` redirects `/portfolio`, `/contact`, `/feed`, `/wp-admin/*`, `/wp-login.php`, `/xmlrpc.php` and `/sitemap.xml` with a 301.
- `redir-slash` strips a trailing slash (`/about/` to `/about`) and keeps the query string.
- `nf-page` serves the designed 404 page with status 404 and `noindex`.
- `nf-back` returns home from the 404 page.
- `redir-edge` sends `http://` and `www.` to `https://austinfalk.com` in one hop (production only).

## How to get to it (user POV)

- Follow an old link or bookmark from the WordPress site.
- Type or paste a URL with a trailing slash.
- Mistype a URL.

## Driving it with site.ts

Preconditions:

- A run is up and `bun $S doctor` exits 0.

- **Full list.** Run `bun run test:redirects "$(jq -r .base .verify/$(cat .verify/current)/state.json)"`. Every line is `ok` and it ends `All checks passed`.
- **Legacy page.** Run `bun $S fetch /contact --as redir-contact`. Status is `301` and `location` is `/`.
- **Trailing slash.** Run `bun $S fetch "/about/?ref=x"`. Status is `301` and `location` is `/about?ref=x`. Run `bun $S goto "/about/?ref=x"`. `url` ends in `/about?ref=x` and `h1` is `About Austin Falk`.
- **Not found.** Run `bun $S fetch /does-not-exist --as nf-http`. Status is `404`. Run `bun $S goto /does-not-exist --as nf-page` and `bun $S shot nf-page`. The title is `Not found | Austin Falk`, `h1` is `Cut.`, and the screenshot shows `That page isn't in this picture.`
- **Noindex.** Run `bun $S eval 'document.querySelector("meta[name=robots]")?.content'`. It prints `noindex`.
- **Back.** Run `bun $S click --role link --name "Back to the start"`. `now.url` is `/`.
- **Edge (production).** Run `bun run test:redirects https://austinfalk.com`. The `http://` and `www` lines are `ok`.

## Gotchas

- `goto` on a 404 page always reports one error, `the server responded with a
status of 404`, for the page itself. Any other error is a failure.
- PR Preview URLs (`*.workers.dev`) serve Cloudflare's plain `Not found`
  instead of the designed page. That's a platform limit, and
  `test:redirects` skips the check there. Prove `nf-page` locally.
- The `http` and `www` redirects live in Cloudflare's dashboard, not in
  `_redirects`. They can't be proven locally, and changing them needs
  Austin's go-ahead.
- Rule order in `public/_redirects` matters. Specific rules go first and the
  trailing-slash rule stays last. Check `docs/private/BASELINE.md` before
  changing a URL.
