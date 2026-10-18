# Home page

The home page opens on a title card: Austin's photo on the left, his name and
intro at the foot of the first screen, and a `Full biography` link. Below it,
one section per pursuit (Entertainment, Finance, Technology, Fitness) scrolls
past the photo, which stays put on desktop and stacks above the text on phones.

## Sub-features

- `home-load` loads cleanly with the site title and the name as the only `<h1>`.
- `home-title-card` shows the name, intro and `Full biography` link on the first desktop screen.
- `home-pursuits` lists the four pursuit sections in order, each an `<h2>`.
- `home-anchors` gives each pursuit heading a `#` link that appears on hover or keyboard focus and deep-links to the section.
- `home-keyboard` tabs through the links in reading order with a visible mustard focus ring.
- `home-phone` stacks the photo above the text at phone width, with no sideways scroll.

## How to get to it (user POV)

- Open `/` directly or from a search result.
- Choose `Austin Falk` at the top of `/about`.
- Choose `Back to the start` on the 404 page.
- Follow a shared deep link such as `/#finance`.

## Driving it with site.ts

Preconditions:

- A run is up and `bun $S doctor` exits 0.

- **Load.** Run `bun $S goto / --width 1440 --as home-load`. The title is `Austin Falk | Actor, Creator, M&A Advisor`, `h1` is `Austin Falk`, and `errors`, `failedRequests` and `scripts` are empty.
- **Title card.** Run `bun $S shot home-title-card`. The first screen shows the photo, the name, the intro paragraph and `Full biography`.
- **Pursuits.** Run `bun $S snapshot home`. In `home.aria.txt`, the `heading (h2)` lines read `Entertainment`, `Finance`, `Technology`, `Fitness`, in that order (each name ends with its anchor's label, such as `Entertainment Link to the Entertainment section`).
- **Anchor by click.** Run `bun $S click --role link --name "Link to the Finance section"`. `now.url` ends in `/#finance` and `now.hashTarget.top` is about 32 (the section sits at the top of the window).
- **Anchor by shared link.** Run `bun $S goto /#finance`. `hashTarget.id` is `finance` and its `top` is about 32.
- **Keyboard.** Run `bun $S goto /`, then `bun $S press Tab`. Focus is `Full biography`, with `focusVisible: true` and an outline in `rgb(231, 178, 62)`. Run `bun $S press Tab`. Focus is `Link to the Entertainment section`, which is now visible. Run `bun $S press Enter`. The URL ends in `/#entertainment`.
- **Phone.** Run `bun $S goto / --width 390 --as home-phone` and `bun $S shot home-phone --full`. The photo is above the name and nothing runs off the right edge. Run `bun $S eval 'document.documentElement.scrollWidth <= innerWidth'`. It prints `true`.

## Gotchas

- The `#` anchors are hidden at phone widths (touch screens have no hover).
  `click` on one there finds the link in the tree but can't hit it, so prove
  `home-anchors` at desktop width.
- Pursuit IDs come from the file names in `src/content/pursuits/`
  (`entertainment`, `finance`, `technology`, `fitness`), not from the
  headings. A renamed heading keeps its old ID.
- Near the end of the page the window can't scroll far enough to put a
  section at the top: at 1440×900, `/#technology` stops at `top` 87 and
  `/#fitness` at 381, with `scrollY` at its maximum. That is correct; check
  `scrollY` against `document.documentElement.scrollHeight - innerHeight`
  before calling a deep link broken.
- The intro and pursuit copy belong to Austin. Report wrong text; don't edit it.
- Headless screenshots don't show hover states. Use `press Tab` to prove that
  a link highlights.
