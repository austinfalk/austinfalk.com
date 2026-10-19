/** Identity and outbound links. Page copy lives in src/content/. */

export const site = {
  name: 'Austin Falk',
  url: 'https://austinfalk.com',
  /** Public address for brands, casting and other business (forwards to Austin). */
  email: 'partnerships@austinfalk.com',
  /** <title> on the home page. */
  title: 'Austin Falk | Actor, Creator, M&A Advisor',
  /** Link-preview (og:description) text, at most ~125 characters; the title already names the roles. */
  shareDescription:
    'Recurring roles on School Spirits and 2 Broke Girls. Lifestyle and fitness creator with more than 50,000 followers.',
  /** Meta description, about 155 characters. */
  description:
    'Austin Falk is an actor, creator, and M&A advisor, known for School Spirits and 2 Broke Girls, who shares his journey with more than 50,000 followers.',
} as const;

/** Describes the profile photo: its alt text on the page and its caption in structured data. */
export const portraitAlt = 'Portrait of Austin Falk in a white T-shirt against a gray wall';

export type SocialKey = 'instagram' | 'tiktok' | 'x' | 'github' | 'linkedin' | 'facebook' | 'imdb';

/**
 * Profiles in Austin's preferred order, used everywhere they're listed (footer,
 * rel="me", structured data sameAs, Markdown and llms.txt): Instagram, TikTok,
 * X, GitHub, LinkedIn, Facebook, IMDb.
 */
export const socials: {
  key: SocialKey;
  label: string;
  href: string;
  /** Approximate followers (Austin, 2026-10-12); update every few months. */
  followers?: number;
}[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/austinfalk',
    followers: 38000,
  },
  { key: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@theaustinfalk', followers: 415 },
  { key: 'x', label: 'X', href: 'https://x.com/austinfalk', followers: 5400 },
  { key: 'github', label: 'GitHub', href: 'https://github.com/austinfalk' },
  { key: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/austinfalk' },
  { key: 'facebook', label: 'Facebook', href: 'https://facebook.com/austinfalk', followers: 7800 },
  { key: 'imdb', label: 'IMDb', href: 'https://www.imdb.com/name/nm6113984/' },
];

/**
 * Facts about Austin for structured data (JSON-LD). Not shown on the page;
 * keep them consistent with the copy, IMDb and Wikidata.
 */
export const person = {
  givenName: 'Austin',
  familyName: 'Falk',
  /** Profile handles, so search engines and LLMs tie the accounts to Austin. */
  alternateName: ['@austinfalk', '@theaustinfalk'],
  jobTitle: ['Actor', 'Content creator', 'M&A advisor'],
  /** Topics from the copy, for search engines' and LLMs' entity graphs. */
  knowsAbout: [
    'Acting',
    'Film and television',
    'Content creation',
    'Lifestyle',
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

/**
 * Selected credits for structured data, in the same order as the list in
 * src/content/about.md. A credit names Austin's character only where the copy
 * does, so structured data never claims more than the page shows; the build
 * fails if titles or characters differ. Characters and IDs match IMDb and TMDB.
 */
export const credits: {
  title: string;
  type: 'TVSeries' | 'Movie';
  /** Only when the copy names it ("- _Title_ (Network, years), Character"). */
  character?: string;
  /** Years Austin appears; one year for a film. */
  years: [number] | [number, number];
  imdb: string;
  tmdb: string;
}[] = [
  {
    title: 'School Spirits',
    type: 'TVSeries',
    character: 'Jason',
    years: [2023, 2026],
    imdb: 'tt21057450',
    tmdb: 'tv/208397',
  },
  {
    title: '2 Broke Girls',
    type: 'TVSeries',
    character: 'Nash',
    years: [2015],
    imdb: 'tt1845307',
    tmdb: 'tv/39340',
  },
  {
    title: 'Killer in Suburbia',
    type: 'Movie',
    years: [2020],
    imdb: 'tt9736976',
    tmdb: 'movie/666139',
  },
  {
    title: 'Tales of Halloween',
    type: 'Movie',
    years: [2015],
    imdb: 'tt4163020',
    tmdb: 'movie/306964',
  },
  {
    title: 'Grandfathered',
    type: 'TVSeries',
    years: [2016],
    imdb: 'tt4465368',
    tmdb: 'tv/63328',
  },
  {
    title: 'Awkward',
    type: 'TVSeries',
    years: [2015],
    imdb: 'tt1663676',
    tmdb: 'tv/39859',
  },
];
