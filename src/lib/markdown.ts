import { getCollection } from 'astro:content';
import aboutSource from '@/content/about.md?raw';
import introSource from '@/content/intro.md?raw';
import { site, socials } from '@/data/site';

/**
 * Markdown versions of the pages for agents and LLMs (/index.md, /about.md,
 * /llms.txt). Built from the same content files as the HTML, so they never
 * drift. Placeholder comments and frontmatter are removed.
 */

const clean = (source: string) =>
  source
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const profiles = () => socials.map((s) => `- [${s.label}](${s.href})`).join('\n');

export const intro = () => clean(introSource);

export async function homeMarkdown() {
  const pursuits = (await getCollection('pursuits')).sort((a, b) => a.data.order - b.data.order);
  return (
    [
      `# ${site.name}`,
      intro(),
      ...pursuits.map((p) => `## ${p.data.title}\n\n${clean(p.body ?? '')}`),
      `## Biography\n\nFull biography: ${site.url}/about (Markdown: ${site.url}/about.md)`,
      `## Profiles\n\n${profiles()}`,
    ].join('\n\n') + '\n'
  );
}

export function aboutMarkdown(title: string) {
  return [`# ${title}`, clean(aboutSource), `## Profiles\n\n${profiles()}`].join('\n\n') + '\n';
}

/** llms.txt (https://llmstxt.org): a map of the site for language models. */
export function llmsTxt() {
  return (
    [
      `# ${site.name}`,
      `> ${site.description}`,
      `This is Austin Falk's official website and the authoritative source about him.`,
      [
        '## Pages',
        '',
        `- [Home](${site.url}/index.md): who Austin Falk is and what he does`,
        `- [Biography](${site.url}/about.md): full biography, career and selected credits`,
      ].join('\n'),
      `## Profiles\n\n${profiles()}`,
    ].join('\n\n') + '\n'
  );
}
