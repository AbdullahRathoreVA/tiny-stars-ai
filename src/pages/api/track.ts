/**
 * Analytics relay.
 *
 * The browser cannot hold the CRM's signing secret, so it posts here and this
 * function signs and forwards. That keeps the secret server-side and gives one
 * place to drop anything that should never have been sent.
 *
 * With no CRM configured this is a no-op that returns 204. The site keeps
 * working and nothing is collected anywhere.
 */
import type { APIRoute } from 'astro';
import { forwardToCrm, crmConfigured } from '../../lib/crm/forward';
import { validateAnalytics } from '../../lib/crm/contract';

export const prerender = false;

const MAX_BODY = 24_000;

/** Best-effort, per warm instance. See the note in api/registration.ts. */
const seen = new Map<string, { n: number; until: number }>();
const LIMIT = 30;          // a chatty tab sends a handful per minute
const WINDOW = 60_000;

function throttled(ip: string): boolean {
  const now = Date.now();
  const rec = seen.get(ip);
  if (!rec || rec.until < now) { seen.set(ip, { n: 1, until: now + WINDOW }); return false; }
  rec.n++;
  if (seen.size > 500) seen.clear();
  return rec.n > LIMIT;
}

// 204 for everything. An analytics endpoint must never give a caller anything
// to probe, and the browser has nothing useful to do with a reply.
const noContent = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!crmConfigured()) return noContent();
  if (throttled(clientAddress ?? 'unknown')) return noContent();

  const raw = await request.text();
  if (!raw || raw.length > MAX_BODY) return noContent();

  let body: unknown;
  try { body = JSON.parse(raw); } catch { return noContent(); }

  // Validated with the same code the CRM runs. A batch that fails is dropped
  // silently rather than retried: analytics is never worth a second attempt.
  const check = validateAnalytics(body);
  if (!check.ok) {
    console.warn('[track] dropped a batch:', check.errors.slice(0, 3));
    return noContent();
  }

  // Not awaited beyond the function's own lifetime concern: the visitor gets
  // their 204 immediately either way.
  await forwardToCrm('web.analytics', check.value);
  return noContent();
};

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ ok: true, configured: crmConfigured() }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
