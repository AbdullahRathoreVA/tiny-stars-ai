/**
 * Server-side plumbing shared by the public intake routes.
 *
 * Every one of these does the same five things in the same order: refuse when
 * no CRM is configured, throttle, cap the body, validate with the same code the
 * CRM runs, then forward it signed. The only thing that differs between them is
 * which event type they send and how the form's field names map onto the shared
 * contract — so that is all a route file should contain.
 *
 * `/api/registration` deliberately still has its own copy. It has been carrying
 * real registrations in production since 2026-08-28, and folding it into this
 * on the same day these three routes appear would make a failure ambiguous
 * about which change caused it. It should move here once these have run.
 */
import type { APIRoute } from 'astro';
import { forwardToCrm, crmConfigured } from './forward';
import type { EventType, Validated } from './contract';

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const MAX_BODY = 32_000;

/**
 * Best-effort per-IP throttle. A serverless function has no shared memory, so
 * this only slows a burst that lands on one warm instance — it is a speed bump,
 * not a security control. Real rate limiting belongs at the edge.
 */
const seen = new Map<string, { n: number; until: number }>();
const LIMIT = 6;
const WINDOW = 60_000;

/**
 * Keyed per route, not per address alone. These routes share one module, so a
 * single counter would mean booking a tour spends the budget for asking a
 * question afterwards — which is an ordinary thing for one parent to do in one
 * sitting, and a baffling thing to be refused for.
 */
function throttled(key: string): boolean {
  const now = Date.now();
  const rec = seen.get(key);
  if (!rec || rec.until < now) { seen.set(key, { n: 1, until: now + WINDOW }); return false; }
  rec.n++;
  if (seen.size > 500) seen.clear(); // never let this grow unbounded
  return rec.n > LIMIT;
}

/** Joins the extra context a form collects but the contract has no field for. */
export function notesFrom(parts: (string | undefined | null)[]): string | undefined {
  const body = parts.map((p) => p?.trim()).filter(Boolean).join('\n\n');
  return body || undefined;
}

/** Trims to undefined rather than empty string: the contract treats them differently. */
export const clean = (v: unknown): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s || undefined;
};

export interface IntakeSpec<T> {
  type: EventType;
  /** Maps the website's own field names onto the shared contract. */
  toContract: (form: Record<string, unknown>) => unknown;
  /** The same validator the CRM will run, so a parent gets a useful message. */
  validate: (raw: unknown) => Validated<T>;
}

export function intakeRoute<T>(spec: IntakeSpec<T>): APIRoute {
  return async ({ request, clientAddress }) => {
    if (!crmConfigured()) {
      // Say so plainly. The front end uses this to keep the preview wording.
      return json({ delivered: false, reason: 'not-configured' });
    }

    if (throttled(`${spec.type}:${clientAddress ?? 'unknown'}`)) {
      return json({ delivered: false, reason: 'rate-limited' }, 429);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ delivered: false, reason: 'too-large' }, 413);

    let form: Record<string, unknown>;
    try { form = JSON.parse(raw) as Record<string, unknown>; }
    catch { return json({ delivered: false, reason: 'invalid' }, 400); }

    const check = spec.validate(spec.toContract(form));
    if (!check.ok) return json({ delivered: false, reason: 'invalid', fields: check.errors }, 400);

    const result = await forwardToCrm(spec.type, check.value);
    return json(
      { delivered: result.delivered, reason: result.reason },
      result.delivered ? 200 : 202, // 202: accepted here, delivery retried out of band
    );
  };
}

/** Lets you confirm the wiring from a browser without sending anything. */
export const statusRoute: APIRoute = async () =>
  json({ ok: true, configured: crmConfigured(), contractVersion: 1 });
