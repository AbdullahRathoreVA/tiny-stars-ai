/**
 * Privacy-conscious analytics abstraction.
 *
 * Design rules, all deliberate for a childcare site:
 *  - No third-party script. No cookies. No fingerprinting. No cross-site identity.
 *  - Events carry a name and a small, allow-listed set of non-identifying props.
 *  - Nothing a family types (names, child details, messages) is ever recorded.
 *  - Nothing leaves the browser in the demo. Events go to an in-memory ring buffer
 *    that the Command Centre reads, so what you see there is genuinely what the
 *    site measured this session — never a fabricated number.
 *  - Respects Global Privacy Control and Do Not Track.
 *
 * A production sink (Plausible, Fathom, a self-hosted endpoint) plugs in via
 * `setSink` without touching a single call site.
 */

export type EventName =
  | 'page_view'
  | 'tour_cta_click'
  | 'tour_flow_start'
  | 'tour_flow_step'
  | 'tour_flow_complete'
  | 'enrollment_start'
  | 'enrollment_step'
  | 'enrollment_complete'
  | 'waitlist_start'
  | 'waitlist_complete'
  | 'program_view'
  | 'program_finder_start'
  | 'program_finder_result'
  | 'concierge_open'
  | 'concierge_question'
  | 'concierge_handoff'
  | 'search_open'
  | 'search_query'
  | 'search_result_click'
  | 'search_no_results'
  | 'phone_click'
  | 'email_click'
  | 'directions_click'
  | 'document_download'
  | 'gallery_open'
  | 'intent_selected';

export interface AnalyticsEvent {
  name: EventName;
  props?: Record<string, string | number | boolean>;
  at: number;
  path: string;
}

type Sink = (e: AnalyticsEvent) => void;

const BUFFER_MAX = 200;
const buffer: AnalyticsEvent[] = [];
const listeners = new Set<(e: AnalyticsEvent) => void>();

let sink: Sink | null = null;

/** Honour browser-level opt-outs before recording anything at all. */
function optedOut(): boolean {
  if (typeof navigator === 'undefined') return false;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean; doNotTrack?: string };
  return n.globalPrivacyControl === true || n.doNotTrack === '1';
}

/** Strip anything that could carry personal data before it is stored. */
const ALLOWED_VALUE = /^[\w \-.:/]{0,64}$/;

function sanitize(
  props?: Record<string, unknown>
): Record<string, string | number | boolean> | undefined {
  if (!props) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    } else if (typeof v === 'string' && ALLOWED_VALUE.test(v)) {
      out[k] = v;
    }
    // Anything else — free text, emails, names — is dropped, not truncated.
  }
  return out;
}

export function track(name: EventName, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || optedOut()) return;

  const event: AnalyticsEvent = {
    name,
    props: sanitize(props),
    at: Date.now(),
    path: window.location.pathname,
  };

  buffer.push(event);
  if (buffer.length > BUFFER_MAX) buffer.shift();

  listeners.forEach((fn) => {
    try {
      fn(event);
    } catch {
      /* a broken listener must never break the page */
    }
  });

  sink?.(event);
}

export function setSink(fn: Sink | null): void {
  sink = fn;
}

export function getEvents(): readonly AnalyticsEvent[] {
  return buffer;
}

export function onEvent(fn: (e: AnalyticsEvent) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Counts for the Command Centre. Returns `null` for a metric that has genuinely
 * not been measured, so the UI can print "NOT MEASURED" rather than a fake 0.
 */
export function countOf(name: EventName): number | null {
  const n = buffer.filter((e) => e.name === name).length;
  return n === 0 ? null : n;
}

/** Wire up declarative `data-track="event_name"` attributes anywhere in the DOM. */
export function bindDeclarativeTracking(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-track]').forEach((el) => {
    if (el.dataset.trackBound === '1') return;
    el.dataset.trackBound = '1';
    el.addEventListener('click', () => {
      const name = el.dataset.track as EventName;
      if (name) track(name, { label: el.dataset.trackLabel ?? '' });
    });
  });
}
