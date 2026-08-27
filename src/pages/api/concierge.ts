/**
 * The concierge endpoint.
 *
 * Order of operations matters and is the whole point:
 *
 *   1. Guardrails + local retrieval produce a grounded answer with sources.
 *      This is the same code path the offline provider uses, so the facts are
 *      identical whether or not a model is configured.
 *   2. Groq rewrites that answer for warmth, and is given nothing else to work
 *      from.
 *   3. `checkOutput` runs again on whatever comes back. A rewrite that smuggled
 *      in a fee, a ratio or a claimed booking is discarded and the local answer
 *      is served instead.
 *
 * So the model can improve the phrasing and can never change the facts. If the
 * key is absent this route still works — it just returns step 1, which is what
 * the site shipped with.
 */
import type { APIRoute } from 'astro';
import { localProvider } from '../../lib/ai/local';
import { checkOutput } from '../../lib/ai/guardrails';
import { rewrite, groqConfigured } from '../../lib/ai/groq';
import type { AIRequest } from '../../lib/ai/provider';

export const prerender = false;

const MAX_MESSAGE = 600;
const MAX_HISTORY = 8;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      // A parent's question is not something to cache at the edge.
      'cache-control': 'no-store',
    },
  });

export const POST: APIRoute = async ({ request }) => {
  let payload: Partial<AIRequest>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'bad-json' }, 400);
  }

  const message = String(payload?.message ?? '').slice(0, MAX_MESSAGE).trim();
  if (!message) return json({ error: 'empty' }, 400);

  const req: AIRequest = {
    message,
    history: Array.isArray(payload.history) ? payload.history.slice(-MAX_HISTORY) : [],
    context: {
      path: String(payload.context?.path ?? '/'),
      intent: payload.context?.intent,
      program: payload.context?.program,
      ageMonths:
        typeof payload.context?.ageMonths === 'number' ? payload.context.ageMonths : undefined,
    },
  };

  // Step 1 — the grounded answer. Never skipped, never bypassed.
  const base = await localProvider.respond(req);

  if (!groqConfigured()) {
    return json({ ...base, flags: [...base.flags, 'groq:not-configured'] });
  }

  // Step 2 — rewrite for warmth, with the draft as the only source material.
  const result = await rewrite({
    message: req.message,
    draft: base.text,
    sources: base.sources.map((s) => s.label),
    handoff: base.handoff,
  });

  if (!result.used) {
    return json({ ...base, flags: [...base.flags, `groq:skipped:${result.reason}`] });
  }

  // Step 3 — the rewrite is not trusted just because it came from a model.
  const check = checkOutput(result.text, base.sources.length > 0);
  if (!check.ok) {
    // The local answer already passed this same check, so falling back to it is
    // strictly safer than serving the guardrail's own refusal text here.
    return json({
      ...base,
      flags: [...base.flags, `groq:rejected:${check.violation}`],
    });
  }

  return json({
    ...base,
    text: result.text,
    flags: [...base.flags, `groq:ok:${result.model}:${result.ms}ms`],
  });
};
