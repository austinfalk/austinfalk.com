---
name: austinfalk.com
description: Dark, cinematic, quiet personal site. One photo, bold type, one accent.
colors:
  ink: '#0c0b09' # page background (warm near-black)
  ink-raised: '#14130f' # cards, popovers
  ink-high: '#1c1a16' # muted surfaces, hover wash
  paper: '#ece5d5' # headings and body text (warm off-white)
  paper-dim: '#a39e90' # secondary text
  mustard: '#e7b23e' # the only accent: links, hover, focus
typography:
  family: Outfit (variable, self-hosted, Latin subset)
  name: { size: 'clamp(3.25rem, 7.5vw, 10rem)', weight: 700, leading: 0.88, tracking: tighter }
  page-title:
    { size: 'clamp(2.75rem, 5.5vw, 7.5rem)', weight: 700, leading: 0.9, tracking: tighter }
  section-title:
    { size: 'clamp(2.25rem, 4.5vw, 6rem)', weight: 700, leading: 0.9, tracking: tighter }
  intro: { size: 'clamp(1.25rem, 1.75vw, 2rem)', weight: 400, leading: snug }
  body: { size: 'clamp(1.0625rem, 1.2vw, 1.375rem)', weight: 400, leading: relaxed }
  small: { size: 0.875rem }
spacing:
  gutter: 'clamp(1.5rem, 5vw, 7rem)' # page margins, as --gutter
  section-gap: 'clamp(4.5rem, 9vw, 11rem)'
rounded:
  base: 0.625rem # shadcn --radius; the site itself has almost no rounded shapes
---

# DESIGN — austinfalk.com

The visual rules for the site. Tokens above mirror `src/styles/global.css`,
which is the source of truth in code; change both together. Scope, content
and SEO decisions live in [docs/SPEC.md](docs/SPEC.md).

## Overview

Cinematic, bespoke, quiet. Less is more; nothing tacky. The site should feel
like a title card, not a template. Dark only, with no theme toggle.

## Colors

Warm near-black, warm off-white, and one mustard accent. Flat color only.
Contrast on `ink`: paper 15.7:1, paper-dim 7.4:1, mustard 10.2:1 (all above
WCAG AAA for body text).

- **Mustard is reserved** for links, hover and focus states. Never for
  headings, list markers, decoration or backgrounds.
- shadcn's theme variables map onto this palette (`--background` = ink,
  `--foreground` = paper, `--primary` and `--ring` = mustard,
  `--muted-foreground` = paper-dim). Use the semantic classes
  (`text-muted-foreground`, `bg-background`), not raw hex values.

## Typography

One family, Outfit, for everything. Headings are bold, tight and large; body
text is regular weight. Sizes are fluid (`clamp()`), so wide screens scale up
instead of leaving empty space. Use the scale in the frontmatter; don't
invent new sizes.

## Layout

- **Split frame** (`src/layouts/SplitLayout.astro`): the photo holds the left
  ~40% of the screen (sticky) while content scrolls on the right ~60%.
  Mobile stacks photo first.
- **Home:** on desktop the name and intro sit at the foot of the first screen
  like a title card; the pursuits follow as you scroll.
- **Biography (`/about`):** same frame, long-form text.
- Sections are separated by **space alone**: no divider lines, boxes or
  cards.

## Imagery

One photo: the 2026 profile shot (`src/assets/profile.jpeg`, the full 3:4
portrait, 3024 × 4032, Display P3 profile kept, EXIF stripped). Astro converts
it to sRGB AVIF/WebP at several widths. Don't strip its color profile.

- Desktop: covers the tall photo column, cropped toward the left (Austin
  stands left of center). Mobile: a square crop of the full width.
- Open Graph card: `src/assets/og.jpeg`, the portrait cropped by hand to
  1.9:1 (hair to chin). Re-crop it if the photo changes.
- Structured data uses a square center crop.

## Favicon

"AF" monogram in Outfit Bold, mustard on a warm black square. The letters
are outlined paths in `public/favicon.svg` (a favicon can't load web fonts);
the `.ico`, Apple touch icon and 192/512 PNGs are rendered from that SVG.

## Components

shadcn/ui (base UI, Maia style, HugeIcons) supplies tokens and component
styles. Components render to static HTML at build time; the page ships no
client-side JavaScript. Social profiles are a row of icon buttons (IMDb as
text) in the footer; at rest 80% paper, mustard on hover.

## Do's and Don'ts

**Do**

- Keep it sparse: one photo, one family, one accent.
- Use space, size and weight for hierarchy.
- Set `width`/`height` on every image (Astro's `<Picture>` does this).
- Propose visible design changes to Austin before making them.

**Don't** (these read as "AI slop" in the first draft)

- Gradients, glows, color washes or film grain
- Serif display + Inter pairings, or a second typeface
- Uppercase, letter-spaced "eyebrow" labels
- Numbered template sections, cards, divider-heavy layouts
- Tilted photos, offset frames, fade-in-on-scroll or other motion gimmicks
- Hover effects on things that aren't clickable
- Emojis

## Decision history

- 2026-10-10: split layout chosen over a widescreen letterbox crop and a
  centered "end credits" layout.
- 2026-10-10: racing green dropped; palette reduced to black, off-white and
  mustard. Credits list and divider lines removed from the home page.
