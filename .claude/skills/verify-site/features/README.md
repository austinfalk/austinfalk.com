# austinfalk.com verification map

This folder is the maintained source for verifying what a visitor (or an
agent reading the site) can reach on austinfalk.com. Read this index, then
use the matching feature file as the recipe. `S` below is
`.claude/skills/verify-site/scripts/site.ts`.

## Baseline preconditions

- `bun run build` has run after the last change to `src/` or `public/`.
- `bun $S up` has started this run, and `bun $S doctor` exits 0.
- Never drive a server or browser this run didn't start (including
  `bun run dev`, `bun run preview` or a deployed URL) unless a recipe says so.

## Driving conventions

- Start each recipe with a `goto` that names its viewport; the viewport
  sticks between commands.
- Find elements by role and accessible name (`click --role link --name ...`),
  not CSS selectors or coordinates. Take a `snapshot` when a name misses.
- Copy quoted names exactly. Typographic apostrophes in the copy (’) are part
  of the text.
- The site has no client-side JavaScript and stores nothing, so there is no
  state to reset between recipes. Only `down` is needed at the end.

## Proof and skip reporting

- A clean load has empty `errors`, `failedRequests` and `scripts`.
- UI proof is the `click`/`press` output plus a snapshot or screenshot of the
  resulting state, named `<feature-id>-<step>`.
- HTTP proof is `fetch --as <name>` output: status, `Location`, headers.
- Name the entry point and viewport with every proof. Report a path you could
  not drive, with the command and the unmet precondition. Never report it as
  verified through a different path.
- Say which environment a proof came from: local `wrangler dev`, a Preview
  URL, or production.

## Feature entry contract

Each feature file starts with an H1 and one paragraph on the visible
behavior, then exactly four H2s in this order: `Sub-features`,
`How to get to it (user POV)`, `Driving it with site.ts` (starting with
`Preconditions:`), and `Gotchas`. Keep implementation details out; name only
paths, accessible names, commands and observable proof.

## Features

- [Home page](./home.md): the title card, intro, pursuit sections and their anchors, at desktop and phone widths.
- [Biography](./biography.md): `/about`, reached from home, with its section anchors, the credits list and the way back.
- [Profiles and contact](./profiles-and-contact.md): the footer's profile links and email on both pages.
- [Redirects and not found](./redirects-and-not-found.md): old WordPress URLs, trailing slashes and the designed 404.
- [Agent-readable copies](./agent-copies.md): `/index.md`, `/about.md`, `/llms.txt`, `robots.txt`, the sitemap and `security.txt`.
