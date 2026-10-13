// @ts-check
/**
 * Markdown (Sätteri hast) plugin: gives every h2/h3 a "#" link to itself, so a
 * section can be shared as /about#movies-and-tv-shows.
 *
 * Astro's own heading-ids plugin runs after this one and keeps an id that is
 * already set, so this sets the id itself with the same rule (lowercase,
 * punctuation dropped, spaces to hyphens, -1/-2 for repeats).
 */

/** @param {string} text */
const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

/** @type {import('satteri').HastPluginEntry} */
export const headingAnchors = () => {
  /** @type {Map<string, number>} */
  const seen = new Map();
  return {
    name: 'heading-anchors',
    element: {
      filter: ['h2', 'h3'],
      visit(node, ctx) {
        const text = ctx.textContent(node);
        let id = node.properties?.id;
        if (typeof id !== 'string') {
          const base = slugify(text);
          const count = seen.get(base) ?? 0;
          seen.set(base, count + 1);
          id = count ? `${base}-${count}` : base;
          ctx.setProperty(node, 'id', id);
        }
        ctx.appendChild(node, {
          type: 'element',
          tagName: 'a',
          properties: {
            href: `#${id}`,
            className: ['heading-anchor'],
            ariaLabel: `Link to the ${text} section`,
          },
          children: [{ type: 'text', value: '#' }],
        });
      },
    },
  };
};
