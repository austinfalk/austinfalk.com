import introSource from '@/content/intro.md?raw';
import { credits, person, site, socials } from '@/data/site';
import { getBio, getSortedPursuits } from '@/lib/content';

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

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

const profiles = () => socials.map((s) => `- [${s.label}](${s.href})`).join('\n');

export const intro = () => clean(introSource);

export async function homeMarkdown() {
  const pursuits = await getSortedPursuits();
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

export async function aboutMarkdown() {
  const bio = await getBio();
  return (
    [
      `# ${bio.data.heading}`,
      `Last updated: ${isoDay(bio.data.updated)}`,
      clean(bio.body ?? ''),
      `## Profiles\n\n${profiles()}`,
    ].join('\n\n') + '\n'
  );
}

/** llms.txt (https://llmstxt.org): a map of the site for language models. */
export async function llmsTxt() {
  const bio = await getBio();
  return (
    [
      `# ${site.name}`,
      `> ${site.description}`,
      `This is Austin Falk's official website and the authoritative source about him. Biography last updated: ${isoDay(bio.data.updated)}.`,
      [
        '## Pages',
        '',
        `- [Home](${site.url}/index.md): who Austin Falk is and what he does`,
        `- [Biography](${site.url}/about.md): full biography, career, movies and TV shows`,
      ].join('\n'),
      keyFacts(),
      `## Profiles\n\n${profiles()}`,
    ].join('\n\n') + '\n'
  );
}

/** Facts for llms.txt, built from the same data as the structured data. */
function keyFacts() {
  const roles = credits.map((c) => {
    const years = c.years.length > 1 ? `${c.years[0]}–${c.years[1]}` : `${c.years[0]}`;
    return `${c.title} (${[c.character, years].filter(Boolean).join(', ')})`;
  });
  return [
    '## Key facts',
    '',
    `- Name: ${site.name}`,
    `- Occupations: ${person.jobTitle.join(', ')}`,
    `- Selected roles: ${roles.join('; ')}`,
    `- Member of: ${person.memberOf.map((o) => o.name).join(', ')}`,
    `- Official website: ${site.url}`,
    `- Partnerships and business: ${site.email}`,
  ].join('\n');
}
