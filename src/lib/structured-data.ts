import { person, site, socials } from '@/data/site';

/** What kind of page the JSON-LD describes. */
export type PageKind = 'home' | 'profile' | 'page';

const personId = `${site.url}/#person`;
const websiteId = `${site.url}/#website`;

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
  image: string;
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
    ...(opts.kind === 'page' ? {} : { about: { '@id': personId } }),
    ...(opts.kind === 'profile' ? { mainEntity: { '@id': personId } } : {}),
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
        inLanguage: 'en',
        publisher: { '@id': personId },
      },
      {
        '@type': 'Person',
        '@id': personId,
        name: site.name,
        givenName: person.givenName,
        familyName: person.familyName,
        url: `${site.url}/`,
        image: opts.image,
        description: site.description,
        jobTitle: person.jobTitle,
        knowsAbout: person.knowsAbout,
        memberOf: person.memberOf.map((org) => ({ '@type': 'Organization', ...org })),
        sameAs: [...socials.map((s) => s.href), ...person.records],
      },
      page,
    ],
  };
}
