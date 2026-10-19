import { getCollection, getEntry, render } from 'astro:content';

/** The biography's entry; the build fails if its frontmatter breaks the schema. */
export async function getBio() {
  const entry = await getEntry('bio', 'about');
  if (!entry) throw new Error('src/content/about.md is missing');
  return entry;
}

/** Pursuits in page order. */
export const getSortedPursuits = async () =>
  (await getCollection('pursuits')).sort((a, b) => a.data.order - b.data.order);

/** Pursuits in page order, each with its rendered Markdown body. */
export async function getPursuits() {
  return Promise.all(
    (await getSortedPursuits()).map(async (entry) => ({
      id: entry.id,
      ...entry.data,
      Content: (await render(entry)).Content,
    })),
  );
}
