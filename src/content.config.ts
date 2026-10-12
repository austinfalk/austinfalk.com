import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/** The things Austin does. One Markdown file each; the body is the blurb. */
const pursuits = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pursuits' }),
  schema: z.object({
    title: z.string(),
    /** Position on the page, lowest first. */
    order: z.number(),
  }),
});

export const collections = { pursuits };
