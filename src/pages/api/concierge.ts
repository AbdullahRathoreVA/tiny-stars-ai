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
import { rewrite, generalGuidance, groqConfigured } from '../../lib/ai/groq';
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

  // Questions that are about THIS centre and are not published. These never go
  // to general guidance: a model answering "what are the ratios" with a
  // sensible-sounding industry figure is exactly the failure this whole site
  // is built to avoid, and a parent has no way to tell it apart from a fact.
  const CENTRE_SPECIFIC = [
    'fees?', 'costs?', 'prices?', 'pricing', 'tuition', 'rates?', 'subsid\\w*', 'afford\\w*', 'deposit',
    // Money without the word: "how much is it per month" contains none of the
    // terms above, and slipped through to the general model. It answered safely
    // because the prompt forbids fees, but the gate is what must hold — the
    // prompt is the second line of defence, not the first.
    'how much (?:is|are|do|does|would|will|per|for|to)', 'per month', 'per week', 'per day', 'a month', 'monthly', 'weekly',
    'charge', 'charges', 'expensive', 'cheap', 'budget',
    'availab\\w*', 'vacanc\\w*', 'openings?', 'waitlist', 'wait list', 'spots?',
    'ratios?', 'staff.to.child', 'how many (?:staff|educators|children|kids)',
    'closing time', 'opening time', 'what time (?:do|does|are)', 'hours',
    // Which days the centre runs is unpublished too, and "are you open on
    // Saturday" contains none of the words above.
    'saturdays?', 'sundays?', 'weekends?', 'which days', 'what days',
    'days (?:are |do )?(?:you )?open', 'open on', 'statutory', 'public holidays?',
    'menus?', 'meal plan',
    'licen[cs]\\w*', 'accredit\\w*',
    'staff names?', 'qualifications?', 'credentials?', 'who (?:works|looks after)',
  ].some((pattern) => new RegExp(`\\b${pattern}\\b`, 'i').test(req.message));

  // Step 2a — nothing in the knowledge base, and not a centre-specific fact:
  // answer from general early-childhood knowledge under the "General guidance"
  // label rather than handing off. The label is the honesty, not the silence.
  // Weak matches count too, not just outright handoffs. "Is it normal for a two
  // year old to bite?" retrieved the separation-anxiety entry at 0.64 — related
  // enough to pass the relevance floor, not actually an answer to the question.
  // Anything the knowledge base is confident about (0.85+) is left alone.
  const weak = base.handoff || base.confidence < 0.7;

  if (weak && !CENTRE_SPECIFIC) {
    const general = await generalGuidance(req.message);
    if (general.used) {
      const check = checkOutput(general.text, false);
      if (check.ok) {
        return json({
          ...base,
          text: general.text,
          trust: 'general',
          sources: [{ label: 'General early-childhood guidance, not Tiny Stars policy' }],
          handoff: false,
          confidence: 0.55,
          flags: [...base.flags, `groq:general:${general.model}:${general.ms}ms`],
        });
      }
      return json({ ...base, flags: [...base.flags, `groq:general-rejected:${check.violation}`] });
    }
    return json({ ...base, flags: [...base.flags, `groq:general-skipped:${general.reason}`] });
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
