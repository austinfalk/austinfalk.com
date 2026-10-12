import type { APIRoute } from 'astro';
import { homeMarkdown } from '@/lib/markdown';

export const GET: APIRoute = async () =>
  new Response(await homeMarkdown(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
