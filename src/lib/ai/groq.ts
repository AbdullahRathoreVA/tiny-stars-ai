/**
 * Groq rewrite pass. Server-side only — this module reads the API key and must
 * never be imported into anything that reaches the browser.
 *
 * The important thing about this file is what it does NOT do: it does not answer
 * questions. Retrieval has already happened locally and produced a grounded
 * answer with sources. Groq is handed that answer and asked to say the same
 * thing more warmly. It rewrites; it does not recall.
 *
 * That ordering is the whole safety argument. A model asked "what does Tiny
 * Stars charge?" will produce a confident number. A model asked "rewrite this
 * paragraph, adding nothing" will not — and `checkOutput` runs on the result
 * either way, so an invented fee or a claimed booking never reaches a family.
 *
 * If the key is missing, the request fails, the model stalls, or the rewrite
 * fails the output check, the caller keeps the local answer. There is no state
 * in which the concierge is worse off for having tried.
 */

const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

/** Fast and free-tier friendly. Swappable without touching anything else. */
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/** A parent waiting on an answer will not wait long. */
const TIMEOUT_MS = 6000;
const MAX_TOKENS = 320;

const SYSTEM = `You rewrite answers for Tiny Stars Daycare's website assistant, "Star Guide".

You are talking to a parent choosing childcare. Be warm, calm and brief.

ABSOLUTE RULES:
- The DRAFT ANSWER below is the only factual material you have. Rewrite it.
- Never add a fact that is not in the draft. Specifically never state or estimate
  fees, prices, availability, vacancies, waitlist length, staff-to-child ratios,
  opening or closing times, menus, staff names or licence numbers. If the draft
  says something is not published, say that plainly and warmly.
- Never claim an action has been taken. You cannot book, reserve, check or hold
  anything.
- Do not invent policies, credentials, awards or statistics.
- Keep the draft's meaning and its level of certainty. If the draft hedges, hedge.
- No markdown, no bullet points, no headings, no emoji. Plain sentences.
- 2 to 4 sentences, under 70 words. British/Canadian spelling.
- Do not greet the parent again or introduce yourself.

Return only the rewritten answer.`;

export interface RewriteInput {
  /** What the parent asked. */
  message: string;
  /** The grounded answer produced by local retrieval. */
  draft: string;
  /** Labels of the sources behind the draft, for tone only. */
  sources: string[];
  /** True when the honest answer is a handoff to a person. */
  handoff: boolean;
}

export interface RewriteResult {
  text: string;
  used: boolean;
  model?: string;
  ms?: number;
  reason?: string;
}

export function groqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export async function rewrite(input: RewriteInput): Promise<RewriteResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { text: input.draft, used: false, reason: 'no-key' };

  const started = Date.now();
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: control.signal,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        // Low but not zero: this is a rewrite, and creativity here is risk.
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              `PARENT ASKED: ${input.message}`,
              '',
              'DRAFT ANSWER (the only facts you may use):',
              input.draft,
              '',
              input.sources.length
                ? `These came from: ${input.sources.join('; ')}`
                : 'No published source backs this; the draft hands off to a person.',
              input.handoff
                ? 'This is a handoff. Keep it a handoff — do not answer the question yourself.'
                : '',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        ],
      }),
    });

    if (!res.ok) {
      return { text: input.draft, used: false, reason: `http-${res.status}` };
    }

    const data = await res.json();
    const text = String(data?.choices?.[0]?.message?.content ?? '').trim();

    // An empty or absurdly long reply means the model did something other than
    // what was asked; the draft is already correct, so keep it.
    if (!text || text.length > 1200) {
      return { text: input.draft, used: false, reason: 'empty-or-oversized' };
    }

    return { text, used: true, model: MODEL, ms: Date.now() - started };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { text: input.draft, used: false, reason: aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}
