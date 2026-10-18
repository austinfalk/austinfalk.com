---
name: verify-site
description: Drive austinfalk.com the way a visitor does (a local Cloudflare server on the built site plus headless Chromium) and capture proof that pages, links, keyboard focus, redirects and the agent-facing copies work. Use before calling a change done, when asked to verify, test or "prove" a page, link, redirect or layout, or when something on the site looks wrong.
---

# Verify austinfalk.com

The site is static: two pages (`/`, `/about`), a designed 404, Cloudflare
redirects and headers, and Markdown copies for agents. Nothing runs in the
browser, so "driving" means loading pages, following links by their
accessible names, tabbing through focus, resizing to desktop and phone, and
checking HTTP responses. The local server is `wrangler dev` serving `dist/`,
which applies `public/_redirects` and `public/_headers` the way production
does. `bun run dev` does not, so never verify against it.

Every step below goes through one helper:

```sh
S=.claude/skills/verify-site/scripts/site.ts
bun $S <command>
```

The header of `scripts/site.ts` lists every command and flag.

## Launch

```sh
bun run build                 # up refuses a missing or stale dist/
bun $S up
```

`up` starts `wrangler dev` on a free port and a headless Chromium with its
own profile, then waits until the home page is actually served (status 200
with its `<h1>`). It prints the run ID, base URL and evidence folder:

```json
{
  "run": "20261018-011158-mcu7",
  "base": "http://127.0.0.1:39183",
  "evidence": ".verify/20261018-011158-mcu7"
}
```

Ready means `up` exits 0 with that JSON. If it fails, it tears down what it
started and names `wrangler.log` in the run folder.

Commands use the run in `.verify/current`. Each `up` creates a separate
run with its own ports and profile, so two agents can verify side by side. When
more than one run is live, set `VERIFY_RUN=<run>` on every command so
each agent drives its own instance.

After you change anything in `src/` or `public/`, rebuild and start a new run.
`wrangler dev` serves whatever `dist/` held when it started, and `doctor`
flags the mismatch.

## Doctor

```sh
bun $S doctor
```

Read-only. It exits non-zero unless all of these hold: both processes this
run started are alive, the home page is served with the site's title, the
browser answers on its debugging port, `dist/` is the same build `up` saw and
is newer than `src/` and `public/`, and HEAD is the commit `up` recorded.
Run it first whenever a result looks odd. If it fails, `down` and `up` again
rather than repairing the instance.

## Drive

Viewports: desktop is 1440×900 (the default) and phone is 390×844
(`goto <path> --width 390`). The viewport sticks to the run until another
`goto` changes it. The browser starts with a mouse, so hover-only UI (the
`#` heading anchors) works at desktop widths. At phone widths it switches to
a touch screen, where those anchors are hidden as they are on a real phone.

| Command                                          | What it does and prints                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `goto <path> [--width W] [--as NAME]`            | Loads the page and prints URL, title, `<h1>`, scroll, hash target, console errors, failed requests and every script loaded.                |
| `click --role link --name "<accessible name>"`   | Clicks by accessible name (as a screen reader hears it) and prints the new location. Off-site and new-tab links are checked, not followed. |
| `press Tab [--times N] [--shift]`, `press Enter` | Keyboard input. Prints the focused element, whether it matches `:focus-visible`, its outline and the location.                             |
| `focus`                                          | Describes the focused element only.                                                                                                        |
| `eval '<expression>'`                            | Read-only inspection, such as computed styles or `matchMedia`. Never use it to change the page.                                            |
| `fetch <path> [--as NAME]`                       | Raw HTTP without following redirects: status, `Location` (made relative), headers, the start of the body.                                  |

Accessible names in this site: `Full biography`, `Austin Falk` (the name
link on `/about`), `Link to the <Heading> section` (each `#` anchor),
`<Profile>, opens in a new tab` (footer profiles), `partnerships@austinfalk.com`,
`Back to the start` (404). The map in `features/` names the rest. When a
name doesn't match, take a `snapshot` and read the tree instead of guessing.

## Evidence

Everything lands in `.verify/<run>/` (gitignored) and survives `down`:

- `snapshot NAME` writes `NAME.aria.txt`, the accessibility tree.
- `shot NAME [--full]` writes `NAME.png` at the run's viewport.
- `goto … --as NAME` writes `NAME.load.json`. `fetch … --as NAME` writes `NAME.http.json` with the full body.

Proof standards:

- Go the way a visitor goes. Reach `/about` by clicking `Full biography`,
  not only by `goto /about`. A feature with several entry points is proven
  only for the entry points you drove.
- Capture the action and its result: the `click`/`press` output (the new
  URL, hash target, focus) plus a snapshot or screenshot of the state it led
  to.
- A page load is clean only when `errors`, `failedRequests` and `scripts`
  are all empty. The site ships no client-side JavaScript, so any entry in
  `scripts` is a failure. The one expected error is the 404 page's own
  `status of 404` line.
- For visual changes, screenshot desktop (1440×900) and phone (390×844), as
  AGENTS.md asks, and look at the images.
- Redirects and headers: `bun run test:redirects` covers the full list.
  Use `fetch` for the specific rule you changed, and `goto` to see where a
  visitor lands.
- Local is not production. The `http`→`https` and `www`→apex redirects,
  Cloudflare Web Analytics and the `workers.dev` `noindex` only exist at the
  edge. Check those with `bun run test:redirects https://austinfalk.com` (or
  the PR's Preview URL) and say which environment each proof came from.

## Cleanup

```sh
bun $S down
```

Stops the server and browser this run started (by the process groups that
`up` recorded, never by name), deletes the browser profile and clears
`.verify/current`. The evidence files stay, and `down` lists them. Run it
after every attempt, including failed ones. Old run folders under `.verify/`
are safe to delete by hand once their proof has been reported.

## Feature map

[`features/README.md`](features/README.md) indexes one recipe per user-facing
feature. Read the matching file before driving a feature, and update the map
when a change adds, renames or removes something a visitor can reach.
