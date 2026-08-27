import type { APIRoute } from 'astro';
import { programs } from '../data/programs';

/**
 * Hand-rolled sitemap — no integration needed for a route list this size, and it
 * keeps the dependency count at one.
 *
 * Demo-only routes (/parent, /command-center, /about-this-demo, /404) are excluded
 * deliberately: they are noindex, and listing a noindex URL in a sitemap is a
 * contradiction that wastes crawl budget.
 *
 * When PUBLIC_INDEXABLE is not 'true' the sitemap is emitted empty, so a preview
 * deploy cannot advertise itself.
 */

const ROUTES: { path: string; priority: number; changefreq: string }[] = [
  { path: '/', priority: 1.0, changefreq: 'monthly' },
  { path: '/why', priority: 0.8, changefreq: 'yearly' },
  { path: '/why/trust-centre', priority: 0.9, changefreq: 'monthly' },
  { path: '/why/questions', priority: 0.7, changefreq: 'yearly' },
  { path: '/programs', priority: 0.9, changefreq: 'monthly' },
  ...programs.map((p) => ({
    path: `/programs/${p.slug}`,
    priority: 0.8,
    changefreq: 'monthly',
  })),
  { path: '/day', priority: 0.7, changefreq: 'yearly' },
  { path: '/learning', priority: 0.7, changefreq: 'yearly' },
  { path: '/experience/gallery', priority: 0.6, changefreq: 'monthly' },
  { path: '/experience/virtual-tour', priority: 0.6, changefreq: 'monthly' },
  { path: '/families/hub', priority: 0.7, changefreq: 'monthly' },
  { path: '/families/documents', priority: 0.7, changefreq: 'monthly' },
  { path: '/families/faq', priority: 0.8, changefreq: 'monthly' },
  { path: '/enroll', priority: 0.9, changefreq: 'monthly' },
  { path: '/enroll/find-your-program', priority: 0.8, changefreq: 'yearly' },
  { path: '/enroll/book-a-tour', priority: 1.0, changefreq: 'monthly' },
  { path: '/enroll/tour-guide', priority: 0.7, changefreq: 'yearly' },
  { path: '/enroll/guide', priority: 0.7, changefreq: 'yearly' },
  { path: '/enroll/registration', priority: 0.8, changefreq: 'monthly' },
  { path: '/enroll/waitlist', priority: 0.8, changefreq: 'monthly' },
  { path: '/careers', priority: 0.6, changefreq: 'monthly' },
  { path: '/contact', priority: 0.9, changefreq: 'monthly' },
  { path: '/accessibility', priority: 0.3, changefreq: 'yearly' },
  { path: '/privacy', priority: 0.3, changefreq: 'yearly' },
];

export const GET: APIRoute = ({ site }) => {
  const indexable = import.meta.env.PUBLIC_INDEXABLE === 'true';
  const base = (site?.href ?? 'https://tinystars.ca').replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const urls = indexable
    ? ROUTES.map(
        (r) => `  <url>
    <loc>${base}${r.path === '/' ? '/' : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`
      ).join('\n')
    : '  <!-- Preview build: intentionally empty. Set PUBLIC_INDEXABLE=true for production. -->';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
