import type { APIRoute } from 'astro';
import { frontmatter } from '@/content/about.md';
import { aboutMarkdown } from '@/lib/markdown';

export const GET: APIRoute = () =>
  new Response(aboutMarkdown(frontmatter.heading), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
