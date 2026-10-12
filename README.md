# austinfalk.com

Personal site for Austin Falk: a home page and a biography (`/about`). Dark,
cinematic, fast, and built to be the authoritative source about Austin for
search engines, agents and LLMs.

Astro + shadcn/ui (rendered at build time, no client JavaScript) + Tailwind
CSS v4, deployed as static assets on Cloudflare Workers. Bun for everything.

```sh
bun install
bun run dev             # http://localhost:4321
bun run preview         # production-like: build + wrangler dev (redirects, headers)
bun run check           # type-check
bun run test:redirects  # redirects, status codes and headers
```

Deploys are automatic: Cloudflare Workers Builds deploys `main`, and every
pull request gets its own Preview URL.

## Where things live

- **Copy:** `src/content/` (Markdown) and `src/data/site.ts`
- **Design rules:** [DESIGN.md](DESIGN.md)
- **Decisions:** [docs/SPEC.md](docs/SPEC.md)
- **Working with coding agents:** [AGENTS.md](AGENTS.md) (commands,
  conventions, what to ask before doing)

## License

The code is MIT licensed. The writing, photographs, and the AF monogram are
© Austin Falk, all rights reserved. See [LICENSE](LICENSE).
