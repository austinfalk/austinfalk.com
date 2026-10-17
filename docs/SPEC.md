# SPEC — austinfalk.com

Living document. Decisions from the October 2026 planning interview. Update as
things change.

## Purpose

A digital reflection of who Austin is and what he does: accurate, succinct, a
baseline. Anyone can land here (casting, fans, business contacts, someone who
just Googled the name) and leave with a clear, credible picture. Social
profiles carry the ongoing content; the site does not try to compete with them.

Replaces the WordPress site currently live at austinfalk.com.

## Identity

The whole person, not a single label: **actor, creator, and M&A advisor**
(chosen 2026-10-12 over "builder"; the content is lifestyle and fitness).
Four pursuits, all named on the page:

1. Entertainment (acting and content creation)
2. Finance (M&A)
3. Technology (software)
4. Fitness

Order on the page is a design decision, not a ranking, and can change.

## Scope (launch)

Two pages: the home page and a biography at `/about`. Room to grow later
(writing) but nothing is built for that yet.

`/about` stays (moved from `/about/`) because it is the site's strongest page
in search, largely from people looking for an encyclopedia-style entry. It
becomes a factual biography: the honest version of what those searchers
want, and the page LLMs are most likely to quote.

Home page sections:

- Name and the profile photo
- Short introduction
- The four pursuits, each with a short Markdown blurb
- Acting: no credits list on the site; notable titles can be mentioned in the
  copy. IMDb is linked with the other profiles.
- Social links

Biography (`/about`):

- A longer, factual, third-person bio: background, career, notable credits
  with networks and years, unions, training, current work in
  each pursuit.
- Same design system as the home page
- Title "About Austin Falk" (or similar). No "Wikipedia" or other keyword
  stuffing.

Not on the site:

- Email address, contact form, phone, address
- Agency / representation info
- A credits list on the home page (the bio page covers credits)
- Posters and old photography from the live or TanStack sites

## Contact

Social links only: Instagram, X, LinkedIn, TikTok, GitHub, Facebook, IMDb.

| Platform  | URL                                    |
| --------- | -------------------------------------- |
| Instagram | https://instagram.com/austinfalk       |
| X         | https://x.com/austinfalk               |
| LinkedIn  | https://www.linkedin.com/in/austinfalk |
| TikTok    | https://www.tiktok.com/@theaustinfalk  |
| GitHub    | https://github.com/austinfalk          |
| Facebook  | https://facebook.com/austinfalk        |
| IMDb      | https://www.imdb.com/name/nm6113984/   |

## Copy

- Voice for the site pages (home, biography): third-person bio style with
  some restraint and mood. Few words. Blog posts (Phase 5) are Austin's own
  writing and can be first person.
- Austin writes the copy. Claude may draft headlines; everything else is a
  placeholder in Markdown (`src/content/`) until Austin replaces it.
- No em dashes in copy. No keyword stuffing ("Austin Falk Wikipedia" style
  titles from the WordPress site are gone).

## Design

Visual rules (palette, type scale, layout, do's and don'ts) live in
[DESIGN.md](../DESIGN.md) at the repo root.

## Tech

| Layer      | Choice                                               |
| ---------- | ---------------------------------------------------- |
| Framework  | Astro (static output)                                |
| Components | shadcn/ui via `@astrojs/react`, server-rendered only |
| Styling    | Tailwind CSS v4                                      |
| Icons      | HugeIcons                                            |
| Package    | Bun                                                  |
| Hosting    | Cloudflare Workers static assets (no Worker script)  |
| Analytics  | Cloudflare Web Analytics (cookie-less)               |

## SEO

- Accurate titles and descriptions written for people.
- Person JSON-LD with `sameAs` for every social profile, IMDb, Wikidata
  (`Q20760336`), TMDB and the Czech Wikipedia article; `jobTitle`,
  `knowsAbout`, union memberships, profile handles (`alternateName`) and
  approximate follower counts per platform. No birth date, nationality or
  location, on purpose.
- The biography is a `ProfilePage` whose selected credits are also
  `TVSeries`/`Movie` nodes with IMDb and TMDB links and Austin's role; the
  build fails if they drift from the copy.
- The portrait is an `ImageObject` (caption, copyright) used by both pages;
  image files are named `austin-falk.*`.
- `WebSite` name "Austin Falk", `alternateName` "austinfalk.com" (Google's
  site-name fallback).
- Markdown copies (`/index.md`, `/about.md`) and `llms.txt` for agents; the
  Markdown copies send a canonical `Link` header to their HTML page.
- Open Graph image hand-cropped from the profile photo.
- Sitemap, robots.txt, and `/.well-known/security.txt` (RFC 9116; renew
  `Expires` yearly).
- **No trailing slashes** (`/about`, not `/about/`). Chosen 2026-10-11 over
  keeping WordPress's slashes; Google treats both equally as long as one form
  is used everywhere and the other redirects permanently. Astro
  `trailingSlash: 'never'` with `build.format: 'file'`; canonical tags,
  sitemap and internal links all use the slash-less form.
- **Redirects:**
  - Page-level redirects live in `public/_redirects` (versioned, deployed
    with the site, testable locally with `wrangler dev`): `/about/` →
    `/about`, `/portfolio(/)` → `/about` (the bio holds the credits),
    `/contact(/)` → `/`, `/sitemap.xml` → `/sitemap-index.xml`, legacy
    WordPress endpoints, then a general rule stripping any trailing slash.
    All 301.
  - Domain-level (`www` → apex, `http` → `https`): handled at Cloudflare's
    edge, outside this repo. All 301, one hop (`http://www` goes straight
    to `https://` on the apex).
  - Cloudflare's built-in `html_handling: drop-trailing-slash` is only a
    fallback (it redirects with a temporary 307).
  - No Worker script.

## Launch

The launch steps, audit checklist and cutover procedure are kept privately,
outside this repo.
