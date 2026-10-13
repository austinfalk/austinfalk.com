import { credits, person, site, socials } from '@/data/site';

/** What kind of page the JSON-LD describes. */
export type PageKind = 'home' | 'profile' | 'page';

const personId = `${site.url}/#person`;
const websiteId = `${site.url}/#website`;
const portraitId = `${site.url}/#portrait`;

/**
 * One connected schema.org graph per page: the WebSite, the Person, and the
 * page itself. The biography is a ProfilePage (Google's markup for a page
 * about one person); the home page is a WebPage about the same Person.
 */
export function structuredData(opts: {
  kind: PageKind;
  url: string;
  title: string;
  description: string;
  /** The portrait: an absolute URL, its size and a caption (the alt text). */
  image: { url: string; width: number; height: number; caption: string };
  created?: string;
  modified?: string;
}) {
  const page = {
    '@type': opts.kind === 'profile' ? 'ProfilePage' : 'WebPage',
    '@id': `${opts.url}#webpage`,
    url: opts.url,
    name: opts.title,
    description: opts.description,
    isPartOf: { '@id': websiteId },
    inLanguage: 'en',
    primaryImageOfPage: { '@id': portraitId },
    ...(opts.kind === 'page' ? {} : { about: { '@id': personId } }),
    ...(opts.kind === 'profile' ? { mainEntity: { '@id': personId } } : {}),
    ...(opts.created ? { dateCreated: opts.created } : {}),
    ...(opts.modified ? { dateModified: opts.modified } : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${site.url}/`,
        name: site.name,
        // Google's site-name fallback if it doesn't use `name`.
        alternateName: 'austinfalk.com',
        inLanguage: 'en',
        publisher: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: site.name,
        alternateName: person.alternateName,
        givenName: person.givenName,
        familyName: person.familyName,
        url: `${site.url}/`,
        image: { '@id': portraitId },
        description: site.description,
        jobTitle: person.jobTitle,
        knowsAbout: person.knowsAbout,
        memberOf: person.memberOf.map((org) => ({ '@type': 'Organization', ...org })),
        email: site.email,
        sameAs: [...socials.map((s) => s.href), ...person.records],
        // Followers per platform, each tied to the profile it counts.
        interactionStatistic: socials
          .filter((s) => s.followers)
          .map((s) => ({
            '@type': 'InteractionCounter',
            interactionType: { '@type': 'FollowAction' },
            userInteractionCount: s.followers,
            interactionService: { '@type': 'WebSite', name: s.label, url: s.href },
          })),
      },
      {
        '@type': 'ImageObject',
        '@id': portraitId,
        url: opts.image.url,
        contentUrl: opts.image.url,
        width: opts.image.width,
        height: opts.image.height,
        caption: opts.image.caption,
        copyrightHolder: { '@id': personId },
        copyrightNotice: `© ${new Date().getFullYear()} ${site.name}. All rights reserved.`,
      },
      page,
      // The biography lists the credits; each links to IMDb and TMDB and names
      // Austin's role, so knowledge graphs connect him to his work.
      ...(opts.kind === 'profile' ? credits.map(creditNode) : []),
    ],
  };
}

function creditNode(c: (typeof credits)[number]) {
  const [start, end = start] = c.years;
  // Films are CreativeWork, not Movie: Google's Movie rich result requires a
  // poster image for every Movie item and flags the page without one. The
  // IMDb and TMDB links identify the film either way. CreativeWork has no
  // `actor` property, so a film names Austin's role through `contributor`.
  const isFilm = c.type === 'Movie';
  const role = isFilm ? 'contributor' : 'actor';
  return {
    '@type': isFilm ? 'CreativeWork' : c.type,
    name: c.title,
    sameAs: [`https://www.imdb.com/title/${c.imdb}/`, `https://www.themoviedb.org/${c.tmdb}`],
    [role]: {
      '@type': 'PerformanceRole',
      [role]: { '@id': personId },
      roleName: 'Actor',
      characterName: c.character,
      startDate: String(start),
      endDate: String(end),
    },
  };
}
