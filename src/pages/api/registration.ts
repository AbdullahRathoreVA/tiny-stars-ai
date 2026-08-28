/**
 * Registration intake.
 *
 * The browser posts the finished step-flow here; this function maps it onto the
 * shared contract, validates it with the SAME validator the CRM runs, and
 * forwards it signed. The browser never sees the CRM's address or its secret.
 *
 * When no CRM is configured — the default for this repo — it returns
 * `delivered: false, reason: "not-configured"` and the site behaves exactly as
 * it always has: a preview that submits nothing. Wiring a CRM is opt-in via two
 * environment variables, so this route can never quietly start shipping real
 * family data because someone deployed a branch.
 */
import type { APIRoute } from 'astro';
import { forwardToCrm, crmConfigured } from '../../lib/crm/forward';
import { validateRegistration, AGE_BANDS, type RegistrationData } from '../../lib/crm/contract';

export const prerender = false;

const json = (body: unknown, status = 200) =>
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

function throttled(ip: string): boolean {
  const now = Date.now();
  const rec = seen.get(ip);
  if (!rec || rec.until < now) { seen.set(ip, { n: 1, until: now + WINDOW }); return false; }
  rec.n++;
  if (seen.size > 500) seen.clear(); // never let this grow unbounded
  return rec.n > LIMIT;
}

/** The website's own field names, mapped onto the shared contract. */
interface FormPayload {
  parentName?: string; relationship?: string;
  childName?: string; ageBand?: string;
  program?: string; startDate?: string; schedule?: string;
  email?: string; phone?: string; questions?: string;
  completedSteps?: number; totalSteps?: number;
}

function toContract(f: FormPayload): RegistrationData {
  const band = AGE_BANDS.find((b) => b === f.ageBand)
    // The form's labels use an en dash; the contract uses a hyphen. Normalise
    // rather than reject, or every submission fails on a typographic detail.
    ?? AGE_BANDS.find((b) => b.replace(/-/g, '') === (f.ageBand ?? '').replace(/[–—-]/g, ''));

  const notes = [
    f.questions?.trim(),
    f.schedule?.trim() ? `Schedule wanted: ${f.schedule.trim()}` : '',
  ].filter(Boolean).join('\n\n');

  return {
    guardian: {
      fullName: (f.parentName ?? '').trim(),
      relationship: f.relationship?.trim() || undefined,
      email: f.email?.trim() || undefined,
      phone: f.phone?.trim() || undefined,
    },
    child: {
      firstName: (f.childName ?? '').trim(),
      ageBand: band,
    },
    programInterest: f.program?.trim() || undefined,
    desiredStart: f.startDate?.trim() || undefined,
    notes: notes || undefined,
    completedSteps: f.completedSteps,
    totalSteps: f.totalSteps,
  };
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!crmConfigured()) {
    // Say so plainly. The front end uses this to keep the preview wording.
    return json({ delivered: false, reason: 'not-configured' });
  }

  const ip = clientAddress ?? 'unknown';
  if (throttled(ip)) return json({ delivered: false, reason: 'rate-limited' }, 429);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ delivered: false, reason: 'too-large' }, 413);

  let form: FormPayload;
  try { form = JSON.parse(raw) as FormPayload; }
  catch { return json({ delivered: false, reason: 'invalid' }, 400); }

  const candidate = toContract(form);

  // Validated here with the same code the CRM will run, so a parent gets a
  // useful message instead of a silent failure two systems away.
  const check = validateRegistration(candidate);
  if (!check.ok) {
    return json({ delivered: false, reason: 'invalid', fields: check.errors }, 400);
  }

  const result = await forwardToCrm('registration.created', check.value);
  return json(
    { delivered: result.delivered, reason: result.reason },
    result.delivered ? 200 : 202, // 202: we accepted it, delivery is retried out of band
  );
};

/** Lets you confirm the wiring from a browser without sending anything. */
export const GET: APIRoute = async () =>
  json({ ok: true, configured: crmConfigured(), contractVersion: 1 });
