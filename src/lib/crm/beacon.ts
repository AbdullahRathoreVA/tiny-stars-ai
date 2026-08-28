/**
 * Ships analytics events to the Command Center.
 *
 * Plugs into the existing `setSink` hook in lib/analytics, so no call site
 * changes and every event still passes that module's sanitiser first.
 *
 * What it does NOT do, deliberately, on a site used by parents:
 *  - no cookie, no localStorage, no persistent id. The session id lives in
 *    sessionStorage and dies with the tab, so the same person tomorrow is a new
 *    session and there is no way to join them up.
 *  - no IP is sent. The server sees one, and stores only a country.
 *  - the referrer is reduced to its host before it leaves the browser, because
 *    a full search URL can contain what somebody searched for.
 *  - it honours Global Privacy Control and Do Not Track, via lib/analytics.
 */
import { setSink, type AnalyticsEvent } from '../analytics';

const ENDPOINT = '/api/track';
const FLUSH_AFTER_MS = 15_000;
const MAX_QUEUE = 40;

type Device = 'mobile' | 'tablet' | 'desktop';

interface Hit {
  name: string;
  path?: string;
  props?: Record<string, string | number | boolean>;
  engagedMs?: number;
  at: string;
}

let queue: Hit[] = [];
let timer: number | undefined;
let started = false;

/** Per tab, not per person. Cleared when the tab closes. */
function sessionId(): string {
  const KEY = 'ts:sid';
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, '');
      sessionStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private mode with storage blocked. One-shot id: the batch still lands,
    // it simply will not be joined to the rest of the visit.
    return (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).replace(/-/g, '');
  }
}

function device(): Device {
  const w = window.innerWidth;
  return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}

/** Host only. A full referrer can carry a search query. */
function referrerHost(): string | undefined {
  if (!document.referrer) return undefined;
  try {
    const host = new URL(document.referrer).hostname.toLowerCase();
    // Our own pages are not a referral source.
    return host === location.hostname ? undefined : host;
  } catch { return undefined; }
}

function utm(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const p = new URLSearchParams(location.search);
  const clean = (v: string | null) =>
    v && /^[\w \-.:/?=&%+]{1,80}$/.test(v) ? v : undefined;
  return {
    utmSource: clean(p.get('utm_source')),
    utmMedium: clean(p.get('utm_medium')),
    utmCampaign: clean(p.get('utm_campaign')),
  };
}

// --------------------------------------------------------------- engagement

/**
 * Time the tab was actually visible, not wall clock. A page left open in a
 * background tab overnight contributes nothing, which is the difference between
 * a number worth reading and a number that flatters.
 */
let visibleSince: number | null = document.visibilityState === 'visible' ? Date.now() : null;
let engagedMs = 0;

function accrue(): void {
  if (visibleSince !== null) {
    engagedMs += Date.now() - visibleSince;
    visibleSince = Date.now();
  }
}

function takeEngaged(): number {
  accrue();
  const v = engagedMs;
  engagedMs = 0;
  return v;
}

// ------------------------------------------------------------------ sending

function payload(finalEngaged: boolean) {
  const hits = queue;
  queue = [];
  if (finalEngaged && hits.length) {
    // Attach the page's engaged time to the last hit in the batch.
    hits[hits.length - 1]!.engagedMs = takeEngaged();
  }
  return {
    sessionId: sessionId(),
    landingPath: location.pathname,
    referrerHost: referrerHost(),
    device: device(),
    ...utm(),
    hits,
  };
}

function flush(useBeacon = false): void {
  if (!queue.length) return;
  const body = JSON.stringify(payload(useBeacon));

  if (useBeacon && navigator.sendBeacon) {
    // The only send that survives the page going away.
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    return;
  }
  // keepalive so an in-flight request is not cancelled by a navigation.
  void fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never surface an error to a parent, and must never retry
    // hard enough to matter. A dropped batch is an acceptable loss.
  });
}

function schedule(): void {
  if (timer !== undefined) return;
  timer = window.setTimeout(() => { timer = undefined; flush(); }, FLUSH_AFTER_MS);
}

function enqueue(e: AnalyticsEvent): void {
  queue.push({
    name: e.name,
    path: e.path,
    props: e.props,
    at: new Date(e.at).toISOString(),
  });
  if (queue.length >= MAX_QUEUE) flush();
  else schedule();
}

/**
 * Starts shipping. Safe to call more than once; only the first call binds.
 * Called from Base.astro after the first page_view is tracked.
 */
export function startBeacon(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  setSink(enqueue);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      accrue();
      visibleSince = null;
      flush(true);
    } else {
      visibleSince = Date.now();
    }
  });

  // pagehide covers the back/forward cache, which 'unload' does not.
  window.addEventListener('pagehide', () => flush(true));
}
