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

/**
 * Candidates, tried in order. Groq retires model ids without much notice —
 * llama-3.3-70b-versatile was the default here and started returning 404 —
 * so a single hardcoded name is a time bomb. The first id that answers is
 * remembered for the life of the process; a 404 or 400 falls through to the
 * next rather than failing the request.
 *
 * GROQ_MODEL, when set, is tried first and the rest stay as backstop.
 */
const MODEL_CANDIDATES = [
  process.env.GROQ_MODEL,
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
].filter(Boolean) as string[];

/** Set once a model answers, so the fallback walk happens at most once. */
let workingModel: string | null = null;

/** A parent waiting on an answer will not wait long. */
const TIMEOUT_MS = 6000;
const MAX_TOKENS = 320;

const SYSTEM = `You rewrite answers for Tiny Stars Daycare's website assistant, "Stella".

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

/**
 * One call, walking the model candidates until one answers.
 * Returns the text, or null with a reason.
 */
async function call(
  key: string,
  messages: { role: string; content: string }[],
  temperature: number
): Promise<{ text: string; model: string; ms: number } | { error: string }> {
  const started = Date.now();
  const order = workingModel
    ? [workingModel, ...MODEL_CANDIDATES.filter((m) => m !== workingModel)]
    : MODEL_CANDIDATES;

  let lastError = 'none';
  for (const model of order) {
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        signal: control.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature, max_tokens: MAX_TOKENS, messages }),
      });

      // 404 and 400 are "this model id is wrong or gone" — try the next one.
      // Anything else (401, 429, 5xx) is about the key or the service, and
      // walking the list would just repeat the same failure.
      if (res.status === 404 || res.status === 400) {
        lastError = `http-${res.status}`;
        continue;
      }
      if (!res.ok) return { error: `http-${res.status}` };

      const data = await res.json();
      const text = String(data?.choices?.[0]?.message?.content ?? '').trim();
      if (!text || text.length > 2000) return { error: 'empty-or-oversized' };

      workingModel = model;
      return { text, model, ms: Date.now() - started };
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      return { error: aborted ? 'timeout' : 'network' };
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: `no-model:${lastError}` };
}

export async function rewrite(input: RewriteInput): Promise<RewriteResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { text: input.draft, used: false, reason: 'no-key' };

  const out = await call(
    key,
    [
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
    // Low but not zero: this is a rewrite, and creativity here is risk.
    0.3
  );

  if ('error' in out) return { text: input.draft, used: false, reason: out.error };
  return { text: out.text, used: true, model: out.model, ms: out.ms };
}

/* ----------------------------------------------------- general guidance -- */

const GENERAL_SYSTEM = `You are Stella, the assistant on Tiny Stars Daycare's website, talking to a parent.

The knowledge base has nothing on this question, so you are answering from general early-childhood knowledge. That is allowed and useful — but it is NOT information about Tiny Stars, and the parent must never be able to mistake it for that.

RULES:
- Answer the parent's actual question, helpfully and specifically. Be genuinely useful.
- Never state anything as Tiny Stars' policy, practice, schedule, price or staffing. You do not know any of it.
- Never state or estimate fees, availability, vacancies, waitlists, staff-to-child ratios, opening or closing times, menus, staff names, qualifications or licence numbers — not for Tiny Stars and not as an industry figure a parent could mistake for Tiny Stars'.
- Never claim to have done anything: you cannot book, check, hold or reserve.
- No invented statistics, studies, awards or citations.
- If the question is really about Tiny Stars specifically, say plainly that you do not have that and the team can confirm it.
- If the question has nothing to do with children, childcare or choosing a daycare, say briefly that it is outside what you can help with, and offer what you can help with instead.
- Warm, calm, plain English. British/Canadian spelling. No markdown, no bullets, no emoji.
- 2 to 5 sentences. Under 90 words.

Return only the answer.`;

export interface GeneralResult {
  text: string;
  used: boolean;
  model?: string;
  ms?: number;
  reason?: string;
}

/**
 * Answers a question the knowledge base could not, from general knowledge.
 *
 * This is the site's third trust level made to actually work. The labels have
 * always been Published / General guidance / Ask the team, and until now the
 * middle one only ever held prewritten copy — anything unanticipated fell
 * straight to "ask the team", which is honest but not much use at eleven at
 * night. A model answering under the label it is actually entitled to is more
 * useful and no less honest, provided the label travels with the answer and
 * the centre-specific facts stay off limits.
 */
export async function generalGuidance(message: string): Promise<GeneralResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { text: '', used: false, reason: 'no-key' };

  const out = await call(
    key,
    [
      { role: 'system', content: GENERAL_SYSTEM },
      { role: 'user', content: message },
    ],
    0.4
  );

  if ('error' in out) return { text: '', used: false, reason: out.error };
  return { text: out.text, used: true, model: out.model, ms: out.ms };
}
