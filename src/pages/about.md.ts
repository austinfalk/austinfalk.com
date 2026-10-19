import type { APIRoute } from 'astro';
import { aboutMarkdown } from '@/lib/markdown';

// Cloudflare sets the Content-Type from the file extension; public/_headers adds the charset.
export const GET: APIRoute = async () => new Response(await aboutMarkdown());
