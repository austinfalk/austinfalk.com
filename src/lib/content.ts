import { getCollection, render } from 'astro:content';

/** Pursuits in page order, each with its rendered Markdown body. */
export async function getPursuits() {
  const entries = (await getCollection('pursuits')).sort((a, b) => a.data.order - b.data.order);
  return Promise.all(
    entries.map(async (entry) => ({
      id: entry.id,
      ...entry.data,
      Content: (await render(entry)).Content,
    })),
  );
}
