/**
 * Guardrails.
 *
 * This is a childcare site, so the failure modes that matter are not "the model
 * said something odd" — they are:
 *
 *   1. Inventing a fee, a ratio, a vacancy or a licence number.
 *   2. Claiming a tour is booked or an enrolment is submitted when it is not.
 *   3. Repeating instructions injected by a visitor as if they were policy.
 *   4. Storing or echoing a child's personal details.
 *
 * Every one of these is checked here, on input and on output. The local provider
 * cannot hallucinate by construction — it only ever returns knowledge-base text —
 * but these run regardless, because a future LLM provider will need them and the
 * checks must not be optional.
 */

export interface InputCheck {
  safe: boolean;
  /** The message with obvious personal data removed before anything else sees it. */
  cleaned: string;
  /** Non-blocking notes surfaced in the Command Centre. */
  flags: string[];
  /** If set, answer with this instead of routing. */
  refusal?: string;
}

const MAX_LEN = 600;

/**
 * Phrases that try to reprogram the assistant. We do not "resist" them cleverly —
 * we strip them and answer the rest of the message normally.
 */
const INJECTION = [
  /ignore (all |any |your )?(previous|prior|above|earlier) (instruction|prompt|rule|direction)/i,
  /disregard (your|all|the) (rules|instructions|guidelines|system prompt)/i,
  /you are (now|actually) (a|an) /i,
  /(reveal|show|print|repeat) (me )?(your|the) (system )?(prompt|instructions|rules)/i,
  /act as (if|though) you (are|were)/i,
  /(developer|debug|admin|god) mode/i,
  /pretend (you|to be)/i,
  /new instructions?:/i,
  /\bDAN\b/,
  /<\/?(system|assistant|instruction)>/i,
];

/** Patterns that must never be stored or echoed back. */
const PII: [RegExp, string][] = [
  [/\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[email removed]'],
  [/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[phone removed]'],
  [/\b\d{3}[-\s]?\d{3}[-\s]?\d{3}\b/g, '[number removed]'],
  [/\b\d{1,5}\s+[A-Za-z]+\s+(street|st|avenue|ave|road|rd|drive|dr|crescent|cres|way|lane|ln|boulevard|blvd)\b/gi, '[address removed]'],
];

/**
 * Topics the assistant must never answer, regardless of how the question is framed.
 * Each returns a refusal that still helps the family get to the right person.
 */
const OUT_OF_SCOPE: { test: RegExp; refusal: string }[] = [
  {
    // Stems are matched with \w* rather than a trailing \b: "autis\b" never matches
    // "autism", which is exactly the question this rule exists to catch.
    test: /\b(?:diagnos\w*|autis\w*|adhd|asd\b|developmental delay|disorder\w*|symptom\w*|prescri\w*|medication dosage|treat(?:ment)? for|is my child (?:sick|ill|autistic|normal|behind))/i,
    refusal:
      'I am not able to give medical or developmental assessments — that belongs with your child’s doctor or a qualified professional. If your question is about how Tiny Stars supports a child with a specific need, the team can talk that through with you directly.',
  },
  {
    test: /\b(legal advice|custody|court order|sue|lawsuit|report (them|the daycare) to)\b/i,
    refusal:
      'That is outside what I can help with. For anything legal, or anything involving custody arrangements, please speak to the Tiny Stars director directly on (780) 230-1599.',
  },
  {
    test: /\b(other|another|competitor|better) (daycare|centre|center|nursery)s?\b.{0,30}\b(better|worse|compare|vs|versus|than)\b/i,
    refusal:
      'I am not the right source for comparing Tiny Stars against other centres — I would not be impartial, and I only have Tiny Stars’ own published information. What I can do is show you exactly what Tiny Stars has published so you can compare it yourself.',
  },
];

export function checkInput(raw: string): InputCheck {
  const flags: string[] = [];
  let text = raw.slice(0, MAX_LEN).trim();

  if (raw.length > MAX_LEN) flags.push('truncated');

  // 1. Strip injection attempts rather than refusing outright — most are curiosity,
  //    and the rest of the message often contains a genuine question.
  let injected = false;
  for (const pattern of INJECTION) {
    if (pattern.test(text)) {
      injected = true;
      text = text.replace(pattern, ' ').trim();
    }
  }
  if (injected) flags.push('prompt-injection-stripped');

  // 2. Remove personal data before it reaches routing, logging or the UI.
  let cleaned = text;
  for (const [pattern, replacement] of PII) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, replacement);
      flags.push('pii-redacted');
    }
  }

  // 3. Hard refusals.
  for (const rule of OUT_OF_SCOPE) {
    if (rule.test.test(cleaned)) {
      return { safe: false, cleaned, flags: [...flags, 'out-of-scope'], refusal: rule.refusal };
    }
  }

  if (!cleaned.replace(/\W/g, '').length) {
    return {
      safe: false,
      cleaned,
      flags: [...flags, 'empty'],
      refusal: 'I did not catch that — could you try again in a few words?',
    };
  }

  return { safe: true, cleaned, flags };
}

/**
 * Output validation. Any claim carrying a number, a currency amount or an
 * availability word must be traceable to a source. If it is not, the answer is
 * replaced with a handoff — we would rather say nothing than say something wrong.
 */
const RISKY_CLAIM = [
  { pattern: /\$\s?\d/, kind: 'a fee' },
  { pattern: /\b\d+\s*(spots?|spaces?|openings?|vacanc)/i, kind: 'availability' },
  { pattern: /\b(1|one|two|2|three|3|four|4)\s*(:|to|per)\s*\d+\s*(ratio|children|kids)/i, kind: 'a ratio' },
  { pattern: /\blicence (number|#)\s*\S+/i, kind: 'a licence number' },
  { pattern: /\b(we have|there are|currently)\s+(space|spaces|room|openings|availability)\b/i, kind: 'availability' },
  { pattern: /\byour (tour|booking|registration) (is|has been) (confirmed|booked|submitted|received)\b/i, kind: 'a confirmed booking' },
];

export interface OutputCheck {
  ok: boolean;
  text: string;
  violation?: string;
}

export function checkOutput(text: string, hasSource: boolean): OutputCheck {
  for (const { pattern, kind } of RISKY_CLAIM) {
    if (pattern.test(text) && !hasSource) {
      return {
        ok: false,
        violation: kind,
        text:
          `I nearly gave you ${kind} there, and I could not trace it back to something Tiny Stars has actually published — so I am not going to guess. The team can confirm it properly.`,
      };
    }
  }
  return { ok: true, text };
}

/** Escape anything a visitor typed before it is rendered back to them. */
export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );
}
