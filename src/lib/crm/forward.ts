/**
 * Server-side only. Signs an event and forwards it to the private Command
 * Center.
 *
 * The signing secret is read from the environment inside a serverless function
 * and never reaches the browser. The website never talks to the CRM database;
 * it posts a signed event to an authenticated endpoint, which is the whole
 * boundary. (spec 32 / 33 / 43)
 */
import { createHmac, randomUUID } from 'node:crypto';
import type { EventEnvelope, EventType } from './contract';

export interface ForwardResult {
  /** false when the CRM is not configured, unreachable, or refused it. */
  delivered: boolean;
  /** Safe to show a parent. Never contains internals. */
  reason?: string;
  /** Present only on success, for the site's own logging. */
  crm?: unknown;
}

/**
 * Deliberately generous, and deliberately under Vercel's 10s function limit.
 *
 * The parent's confirmation is never blocked on this — it is already on screen
 * by the time this runs — so a couple of extra seconds costs them nothing. What
 * a short timeout costs is a lost registration when the CRM is briefly slow,
 * and that is the one failure this whole system exists to prevent.
 */
const TIMEOUT_MS = 8000;

/**
 * Reads a server-side variable from whichever place actually holds it.
 *
 * On Vercel the real environment is in `process.env`. Locally, Astro loads .env
 * into `import.meta.env` server-side and does NOT copy it to process.env, so a
 * process.env-only read works in production and silently reports
 * "not-configured" on your own machine. Both are checked, process.env first.
 *
 * The lookup is dynamic on purpose: `import.meta.env.CRM_INGEST_SECRET` written
 * literally would be statically replaced at build time and bake the secret into
 * the build artifact.
 */
function serverEnv(key: string): string | undefined {
  const fromProcess = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  if (fromProcess) return fromProcess;
  const meta = import.meta.env as unknown as Record<string, string | undefined>;
  return meta?.[key];
}

function crmConfig(): { url: string; secret: string } | null {
  // Read at call time, not module load: on Vercel the env is present per
  // invocation, and reading at import can capture a build-time blank.
  const url = serverEnv('CRM_INGEST_URL')?.trim();
  const secret = serverEnv('CRM_INGEST_SECRET')?.trim();
  if (!url || !secret) return null;
  return { url, secret };
}

export function crmConfigured(): boolean {
  return crmConfig() !== null;
}

export async function forwardToCrm(
  type: EventType,
  data: unknown,
  opts: { eventId?: string; source?: EventEnvelope['source'] } = {},
): Promise<ForwardResult> {
  const cfg = crmConfig();
  if (!cfg) {
    // The default state of this repo. Not an error: the public demo runs with
    // no CRM behind it and must keep working exactly as it does today.
    return { delivered: false, reason: 'not-configured' };
  }

  const envelope: EventEnvelope = {
    eventId: opts.eventId ?? randomUUID(),
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    source: opts.source ?? 'website',
    data,
  };

  const body = JSON.stringify(envelope);
  const signature = createHmac('sha256', cfg.secret).update(body, 'utf8').digest('hex');
  const timestamp = String(Date.now());

  // A slow CRM must never hold a parent's browser open. If it times out the
  // submission is still safe: the event id makes a later retry idempotent.
  const abort = AbortSignal.timeout(TIMEOUT_MS);

  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-crm-signature': signature,
        'x-crm-timestamp': timestamp,
      },
      body,
      signal: abort,
    });

    if (!res.ok) {
      // Log the detail server-side; hand the caller something harmless.
      const detail = await res.text().catch(() => '');
      console.error('[crm] forward rejected', res.status, detail.slice(0, 400));
      return { delivered: false, reason: res.status === 400 ? 'rejected' : 'unavailable' };
    }
    return { delivered: true, crm: await res.json().catch(() => null) };
  } catch (err) {
    console.error('[crm] forward failed', err instanceof Error ? err.message : err);
    return { delivered: false, reason: 'unavailable' };
  }
}
