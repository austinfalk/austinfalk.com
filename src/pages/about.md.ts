import type { APIRoute } from 'astro';
import { frontmatter } from '@/content/about.md';
import { aboutMarkdown } from '@/lib/markdown';

// Cloudflare sets the Content-Type from the file extension; public/_headers adds the charset.
export const GET: APIRoute = () => new Response(aboutMarkdown(frontmatter.heading));
