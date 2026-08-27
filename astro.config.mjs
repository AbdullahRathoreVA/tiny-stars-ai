// @ts-check
import { defineConfig } from 'astro/config';

/**
 * Tiny Stars 2.0 — demo build.
 *
 * PUBLIC_INDEXABLE is the single switch between "demo" and "production":
 *   - unset / 'false' (default): every page ships <meta name="robots" content="noindex">
 *     and robots.txt disallows everything. The demo can never outrank or duplicate
 *     the live tinystars.ca in search.
 *   - 'true': normal indexable output, canonical URLs against PUBLIC_SITE_URL.
 */
const SITE = process.env.PUBLIC_SITE_URL || 'https://tinystars.ca';

export default defineConfig({
  site: SITE,
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  compressHTML: true,
  // No custom CSS minifier: esbuild's built-in one is fast and good enough, and
  // pulling in lightningcss would double the dependency count for a few bytes.
});
