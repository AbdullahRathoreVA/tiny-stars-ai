/**
 * Structured data.
 *
 * Rule: a property only appears here if the underlying fact is published by Tiny
 * Stars. That means NO `priceRange`, NO `aggregateRating`, NO `openingHours` (only
 * the 6:00 PM close is documented, and a closing time alone is not a valid opening
 * specification), and NO `numberOfEmployees`. Inventing any of them would be both
 * dishonest and a structured-data violation.
 */

import { site, documents } from '../data/site';
import { programs } from '../data/programs';
import type { Entry } from '../data/knowledge';

const BASE = site.productionUrl;

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'ChildCare',
  '@id': `${BASE}/#organization`,
  name: site.name,
  description:
    'Family-owned, licensed and insured daycare in Grande Prairie, Alberta, offering care and early learning for children from 12 months to 12 years.',
  url: BASE,
  telephone: '+1-780-230-1599',
  email: site.email.general,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.city,
    addressRegion: site.address.regionCode,
    postalCode: site.address.postalCode,
    addressCountry: site.address.countryCode,
  },
  areaServed: {
    '@type': 'City',
    name: site.address.city,
  },
  sameAs: [site.social.facebook, site.social.instagram, site.social.tiktok],
  logo: `${BASE}/assets/images/logo.png`,
  image: `${BASE}/assets/images/sections/who-we-are.webp`,
};

export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${BASE}/#website`,
  name: site.name,
  url: BASE,
  publisher: { '@id': `${BASE}/#organization` },
  inLanguage: 'en-CA',
};

export function breadcrumbSchema(trail: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${BASE}${t.href === '/' ? '' : t.href}`,
    })),
  };
}

/**
 * FAQPage schema, built only from entries Tiny Stars has actually published.
 * `general` and `unknown` answers are excluded — Google's guidelines expect FAQ
 * markup to reflect authoritative answers from the site owner, and an "ask the
 * team" answer is not one.
 */
export function faqSchema(entries: Entry[]) {
  const verified = entries.filter((e) => e.trust === 'verified');
  if (!verified.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: verified.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  };
}

export function programSchema(slug: string) {
  const p = programs.find((x) => x.slug === slug);
  if (!p) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${p.name} — ${p.familiar}`,
    serviceType: 'Child care program',
    description: p.official,
    provider: { '@id': `${BASE}/#organization` },
    areaServed: { '@type': 'City', name: site.address.city },
    audience: {
      '@type': 'PeopleAudience',
      suggestedMinAge: Math.round((p.ageMinMonths / 12) * 10) / 10,
      suggestedMaxAge: Math.round((p.ageMaxMonths / 12) * 10) / 10,
    },
    url: `${BASE}/programs/${p.slug}`,
  };
}

export const documentsSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Tiny Stars parent documents',
  itemListElement: documents.map((d, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'DigitalDocument',
      name: d.title,
      description: d.description,
      url: `${BASE}${d.file}`,
      encodingFormat: 'application/pdf',
    },
  })),
};
