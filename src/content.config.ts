import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/** The biography (/about). The limits are the ones its frontmatter comments give. */
const bio = defineCollection({
  loader: glob({ pattern: 'about.md', base: './src/content' }),
  schema: z.object({
    title: z.string(),
    heading: z.string(),
    created: z.date(),
    updated: z.date(),
    shareDescription: z.string().max(125),
    description: z.string().min(140).max(160),
  }),
});

/** The things Austin does. One Markdown file each; the body is the blurb. */
const pursuits = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pursuits' }),
  schema: z.object({
    title: z.string(),
    /** Position on the page, lowest first. */
    order: z.number(),
  }),
});

export const collections = { bio, pursuits };
