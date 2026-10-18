# Biography

`/about` is the long-form biography: a link home in Austin's name, the
`About Austin Falk` heading, and sections for Career, Entertainment (with the
`Movies and TV Shows` credits list), Finance (with `Selected Industries`),
Technology, Fitness and Education. Every section heading can be shared as a
deep link, and the old `/portfolio` URL lands on the credits.

## Sub-features

- `bio-reach` opens the biography from the home page's `Full biography` link.
- `bio-load` loads cleanly with its own title and heading.
- `bio-sections` shows the section headings in order, `h2` for sections and `h3` for subsections.
- `bio-credits` lists the six credits in order, titles in italics.
- `bio-anchors` deep-links each section heading with its `#` link.
- `bio-home` returns home through the `Austin Falk` link.
- `bio-phone` reads at phone width with the photo stacked on top.

## How to get to it (user POV)

- Choose `Full biography` on `/`.
- Open `/about` directly or from a search result.
- Open an old link to `/portfolio`, which lands on `/about#movies-and-tv-shows`.
- Open `/about/` with a trailing slash, which redirects to `/about`.

## Driving it with site.ts

Preconditions:

- A run is up and `bun $S doctor` exits 0.

- **Reach from home.** Run `bun $S goto / --width 1440`, then `bun $S click --role link --name "Full biography"`. `now.url` ends in `/about`, the title is `Austin Falk | Biography`, and `h1` is `About Austin Falk`.
- **Clean load.** Run `bun $S goto /about --as bio-load`. `errors`, `failedRequests` and `scripts` are empty.
- **Sections.** Run `bun $S snapshot bio`. In `bio.aria.txt`, the headings below `heading (h1) "About Austin Falk"` are, in order: `Career` (h2), `Entertainment` (h2), `Movies and TV Shows` (h3), `Finance` (h2), `Selected Industries` (h3), `Technology` (h2), `Fitness` (h2), `Education` (h2). Each heading's name ends with its anchor's label, as in `heading (h2) "Career Link to the Career section"`.
- **Credits.** In the same snapshot, the `list` under `Movies and TV Shows` has six `listitem`s whose `emphasis` text reads `School Spirits`, `2 Broke Girls`, `Killer in Suburbia`, `Tales of Halloween`, `Grandfathered`, `Awkward`, in that order.
- **Anchor.** Run `bun $S click --role link --name "Link to the Movies and TV Shows section"`, then `bun $S shot bio-credits`. `now.url` ends in `#movies-and-tv-shows`, `hashTarget.top` is about 32, and the screenshot shows the credits list.
- **Old portfolio link.** Run `bun $S fetch /portfolio`. Status is `301` and `location` is `/about#movies-and-tv-shows`. Run `bun $S goto /portfolio`. `hashTarget.id` is `movies-and-tv-shows`.
- **Back home.** Run `bun $S goto /about`, then `bun $S click --role link --name "Austin Falk"`. `now.url` is `/` and `h1` is `Austin Falk`.
- **Phone.** Run `bun $S goto /about --width 390` and `bun $S shot bio-phone --full`. The text column fits the screen and `eval 'document.documentElement.scrollWidth <= innerWidth'` prints `true`.

## Gotchas

- `click --role link --name "Austin Falk"` matches only on `/about`. The home
  page's name is a heading, not a link.
- The build fails if the credits list in `src/content/about.md` and
  `credits` in `src/data/site.ts` disagree, so a passing build already proves
  they match. The recipe checks what a visitor sees.
- Heading IDs come from the heading text. Renaming a heading changes its
  URL and breaks shared links and the `/portfolio` redirect target. Check
  `public/_redirects` before renaming `Movies and TV Shows`.
- Flag credits that contradict IMDb; don't change them.
