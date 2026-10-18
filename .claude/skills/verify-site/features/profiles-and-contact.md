# Profiles and contact

Both pages end with the same footer: a `Profiles` row of seven links
(Instagram, TikTok, X, GitHub, LinkedIn, Facebook, IMDb) that open in a new
tab, the public email address, and a copyright line with the current year.

## Sub-features

- `footer-profiles` lists the seven profiles in Austin's order, each opening in a new tab.
- `footer-rel-me` marks each profile link `rel="me"` so the accounts verify each other.
- `footer-email` links `partnerships@austinfalk.com` with `mailto:`.
- `footer-copyright` shows `© <current year> Austin Falk`.
- `footer-keyboard` reaches every footer link by keyboard with a visible focus ring.

## How to get to it (user POV)

- Scroll to the bottom of `/` or `/about`.
- Tab past the page's last content link.

## Driving it with site.ts

Preconditions:

- A run is up and `bun $S doctor` exits 0.

- **Order.** Run `bun $S goto / --width 1440`, then `bun $S snapshot footer`. In `footer.aria.txt`, the `navigation "Profiles"` holds links named `Instagram, opens in a new tab`, `TikTok, opens in a new tab`, `X, opens in a new tab`, `GitHub, opens in a new tab`, `LinkedIn, opens in a new tab`, `Facebook, opens in a new tab`, `IMDb, opens in a new tab`, in that order.
- **Each profile.** Run `bun $S click --role link --name "Instagram, opens in a new tab"` (repeat for each). The output has `clicked: false`, `target: "_blank"`, `rel: "me noopener noreferrer"` and the profile's `href`.
- **Email.** Run `bun $S click --role link --name "partnerships@austinfalk.com"`. `href` is `mailto:partnerships@austinfalk.com` and it is not followed.
- **Copyright.** Run `bun $S eval 'document.querySelector("footer").textContent.includes("© " + new Date().getFullYear() + " Austin Falk")'`. It prints `true`.
- **Keyboard.** Run `bun $S press Tab --shift`, starting from a fresh `bun $S goto /`. Shift+Tab from the top wraps to the end of the page. Focus is `partnerships@austinfalk.com`, the last link, with `focusVisible: true`. Run `bun $S press Tab --shift` again. Focus moves to `IMDb, opens in a new tab`. Run `bun $S shot footer-focus`.
- **Other page.** Repeat **Order** on `/about`. The list is the same.

## Gotchas

- Links that leave the site are never followed: `click` reports them and stops.
  Don't load social sites to prove a link; the `href` is the proof.
- The copyright year is the build's year. A build from December shows that
  year until the next deploy.
- Profile order and URLs come from `socials` in `src/data/site.ts`, which also
  feeds structured data, `llms.txt` and the Markdown copies. A change there
  shows up in all of them.
