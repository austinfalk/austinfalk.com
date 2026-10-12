/** Identity and outbound links. Page copy lives in src/content/. */

export const site = {
  name: 'Austin Falk',
  url: 'https://austinfalk.com',
  /** <title> on the home page. */
  title: 'Austin Falk | Actor, Creator, M&A Advisor',
  /** Meta description, about 155 characters. */
  description:
    'Austin Falk is an actor, creator, and M&A advisor, known for School Spirits and 2 Broke Girls, who shares his journey with more than 50,000 followers.',
} as const;

export type SocialKey = 'instagram' | 'tiktok' | 'x' | 'github' | 'linkedin' | 'facebook' | 'imdb';

/**
 * Profiles in Austin's preferred order, used everywhere they're listed (footer,
 * rel="me", structured data sameAs, Markdown and llms.txt): Instagram, TikTok,
 * X, GitHub, LinkedIn, Facebook, IMDb.
 */
export const socials: { key: SocialKey; label: string; href: string }[] = [
  { key: 'instagram', label: 'Instagram', href: 'https://instagram.com/austinfalk' },
  { key: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@theaustinfalk' },
  { key: 'x', label: 'X', href: 'https://x.com/austinfalk' },
  { key: 'github', label: 'GitHub', href: 'https://github.com/austinfalk' },
  { key: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/austinfalk' },
  { key: 'facebook', label: 'Facebook', href: 'https://facebook.com/austinfalk' },
  { key: 'imdb', label: 'IMDb', href: 'https://www.imdb.com/name/nm6113984/' },
];

/**
 * Facts about Austin for structured data (JSON-LD). Not shown on the page;
 * keep them consistent with the copy, IMDb and Wikidata.
 */
export const person = {
  givenName: 'Austin',
  familyName: 'Falk',
  jobTitle: ['Actor', 'Content creator', 'M&A advisor'],
  /** Topics from the copy, for search engines' and LLMs' entity graphs. */
  knowsAbout: [
    'Acting',
    'Film and television',
    'Content creation',
    'Mergers and acquisitions',
    'Private equity',
    'Software development',
    'Fitness',
  ],
  memberOf: [
    { name: 'SAG-AFTRA', url: 'https://www.sagaftra.org' },
    { name: 'UBCP/ACTRA', url: 'https://www.ubcpactra.ca' },
  ],
  /** Other authoritative records about Austin, added to `sameAs` alongside the social profiles. */
  records: [
    'https://www.wikidata.org/wiki/Q20760336',
    'https://www.themoviedb.org/person/1321836',
    'https://cs.wikipedia.org/wiki/Austin_Falk',
  ],
};
