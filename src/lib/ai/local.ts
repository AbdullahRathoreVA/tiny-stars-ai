/**
 * LocalProvider — deterministic, retrieval-only, offline.
 *
 * It cannot hallucinate, because it never generates a fact: every sentence it
 * returns is either knowledge-base text, a fixed template, or the visitor's own
 * words echoed back safely. What it *does* do is understand intent, pick a
 * specialist, respond with the right tone, and always leave a way forward.
 */

import { knowledge, type Entry, type Trust } from '../../data/knowledge';
import { programs, programForAgeMonths } from '../../data/programs';
import { site } from '../../data/site';
import { nodeForTopic } from '../../data/constellation';
import { zoneForKeyword } from '../../data/dayZones';
import { Index } from '../text';
import { agents, agentById, type Agent, type AgentId } from './agents';
import { checkInput, checkOutput } from './guardrails';
import {
  registerProvider,
  type AIProvider,
  type AIRequest,
  type AIResponse,
  type Action,
  type Source,
} from './provider';

/* ------------------------------------------------------------------ index -- */

const index = new Index<Entry>(knowledge, (e) => [
  { text: e.question, weight: 3 },
  { text: e.keywords.join(' '), weight: 2.4 },
  { text: e.answer, weight: 1 },
]);

/* ------------------------------------------------------------- age parsing -- */

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

/** Pulls a child's age out of natural language. Returns months, or null. */
export function parseAge(text: string): number | null {
  const t = text.toLowerCase();

  const months = t.match(/(\d{1,2})\s*(?:-|\s)?month/);
  if (months) {
    const n = parseInt(months[1], 10);
    if (n >= 0 && n <= 144) return n;
  }

  const years = t.match(/(\d{1,2})\s*(?:-|\s)?(?:year|yr|y\/o|yo)\b/);
  if (years) {
    const n = parseInt(years[1], 10);
    if (n >= 0 && n <= 12) return n * 12;
  }

  const worded = t.match(
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)[\s-]*(year|yr)/
  );
  if (worded) return NUMBER_WORDS[worded[1]] * 12;

  // "my child is 2", "she's 4", "he is 3 and a half"
  const bare = t.match(/\b(?:is|she'?s|he'?s|they'?re|turning|aged?)\s+(\d{1,2})\b/);
  if (bare) {
    const n = parseInt(bare[1], 10);
    if (n >= 1 && n <= 12) return n * 12;
  }

  return null;
}

/* ---------------------------------------------------------------- routing -- */

interface Routed {
  agent: Agent;
  score: number;
}

function routeToAgent(message: string, context: AIRequest['context']): Routed {
  const t = ` ${message.toLowerCase()} `;
  let best: Routed = { agent: agentById('concierge'), score: 0 };

  for (const agent of agents) {
    if (!agent.live || !agent.triggers.length) continue;
    let score = 0;
    for (const trigger of agent.triggers) {
      if (!t.includes(trigger)) continue;
      // Longer, more specific triggers count for more; early mentions count for more.
      const position = t.indexOf(trigger) / t.length;
      score += (1 + trigger.length / 12) * (1.25 - position * 0.5);
    }
    if (score > best.score) best = { agent, score };
  }

  // A stated age is a strong signal for the program advisor, but only when the
  // message is not clearly about something else.
  if (parseAge(message) !== null && best.score < 3) {
    best = { agent: agentById('program-advisor'), score: Math.max(best.score, 2.5) };
  }

  // Session context breaks ties: someone reading a program page asking a vague
  // question almost always means that program.
  if (best.score < 1 && context.program) {
    best = { agent: agentById('program-advisor'), score: 1 };
  }

  return best;
}

/* ------------------------------------------------------------ small talk -- */

/**
 * Conversational turns, answered before retrieval runs.
 *
 * "hi" used to reach the knowledge base and come back with the careers answer,
 * because two characters is enough bigram overlap with "hiring" to clear the
 * relevance floor. A parent saying hello was told about resume uploads.
 *
 * These replies deliberately contain no fact about Tiny Stars — they orient and
 * hand back. That keeps them outside the sourcing rules entirely, because there
 * is nothing in them to source.
 */
const SMALL_TALK: { test: RegExp; reply: string; followUps: string[] }[] = [
  {
    test: /^\s*(hi|hii+|hey+|hello+|yo|hiya|howdy|salam|assalamu? ?alaikum|good (morning|afternoon|evening))\b(\s+(there|guys|team|all|everyone|star guide))?[\s!.,?]*$/i,
    reply: [
      "Hello. I'm Stella, the Tiny Stars star guide. Ask me about the programs, what a day looks like, safety, or booking a tour.",
      "One thing worth knowing up front: I only use what Tiny Stars has actually published. If something has not been published — fees, availability, ratios — I will tell you that rather than guess, and point you at someone who can answer properly.",
    ].join('\n\n'),
    followUps: ['What programs do you offer?', 'What happens during the day?', 'How do I book a tour?'],
  },
  {
    test: /^\s*(thanks|thank you|thankyou|ty|cheers|appreciate it|got it|great|perfect|ok|okay)\b[\s!.,?]*$/i,
    reply:
      "Any time. If there is anything else you want to check before deciding, ask away — and if you would rather see the place in person, a tour takes about thirty minutes.",
    followUps: ['How do I book a tour?', 'What should I ask on a tour?'],
  },
  {
    test: /^\s*(bye|goodbye|see ya|see you|good ?night)\b[\s!.,?]*$/i,
    reply:
      'Take care. Nothing you typed here leaves your device, so you can pick this up whenever suits.',
    followUps: ['How do I book a tour?'],
  },
  {
    test: /\b(what can you do|what do you do|who are you|what are you|are you (a )?(real|human|person|bot|robot|ai)|how do you work|are you chatgpt)\b/i,
    reply: [
      "I'm Stella — software, not a person, and I will not pretend otherwise.",
      "I answer from what Tiny Stars has published and show you where each answer came from. I can help you find the right program for your child's age, explain what a day looks like, walk through the published safety policies, and get you to a tour booking. What I cannot do is invent a fee, a vacancy or a ratio, so when those come up I hand you to the team.",
    ].join('\n\n'),
    followUps: ['What programs do you offer?', 'Tell me about safety', 'How do I book a tour?'],
  },
];

function smallTalk(message: string) {
  return SMALL_TALK.find((s) => s.test.test(message));
}

/* ------------------------------------------------------------- retrieval -- */

function retrieve(message: string, agent: Agent): { entry: Entry; score: number }[] {
  // The index does bigram fuzzy matching for typo tolerance, which is the right
  // call for "prgrams" and the wrong one for "hi": a two-character token
  // overlaps enough of "hiring" to look like a real match. Anything without a
  // word of at least four characters is not a query, it is an utterance.
  const longEnough = message.split(/\W+/).some((w) => w.length >= 4);
  if (!longEnough) return [];

  const all = index.search(message, 6);
  if (!all.length) return [];

  // A hit has to share at least one real word with the question. Bigram
  // similarity alone will happily rank "hey there" against an entry about
  // daily-report apps, and an answer on confidently the wrong subject is worse
  // for a parent than "I don't know" — it looks like the question was
  // understood. Requiring lexical overlap makes the fuzzy pass a tie-breaker
  // rather than a matchmaker.
  // Stopwords are excluded from the overlap test, or it never fires: almost
  // every entry contains "what" and "child", so "what is the weather" would
  // ground itself against an answer about separation anxiety.
  const STOP = new Set([
    'what', 'when', 'where', 'which', 'does', 'have', 'your', 'this', 'that', 'with',
    'from', 'they', 'them', 'there', 'here', 'would', 'could', 'should', 'about',
    'tell', 'know', 'like', 'want', 'need', 'give', 'take', 'make', 'just', 'also',
    'much', 'many', 'more', 'some', 'any', 'you', 'the', 'and', 'for', 'are',
    'child', 'children', 'kid', 'kids', 'please', 'thanks', 'hello',
    // Age words are in almost every entry, so they ground anything to the
    // programs answer: "how do I get my 4 year old to sleep" came back as
    // "a 2-year-old falls into Comet Stars". The age still routes placement
    // questions — parseAge reads it separately — it just cannot be the reason
    // an entry is considered relevant.
    'year', 'years', 'month', 'months', 'old', 'age', 'ages', 'baby', 'babies',
    'toddler', 'toddlers', 'preschooler', 'preschoolers',
  ]);
  const asked = (message.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(
    (w) => w.length >= 4 && !STOP.has(w)
  );
  if (asked.length) {
    const grounded = all.filter((r) => {
      const hay = `${r.item.question} ${r.item.answer} ${r.item.keywords.join(' ')}`.toLowerCase();
      return asked.some((w) => hay.includes(w));
    });
    if (!grounded.length) return [];
    all.length = 0;
    all.push(...grounded);
  }

  // Prefer entries inside the agent's scope, but do not discard a much stronger
  // out-of-scope match — the router is a heuristic, not an authority.
  const inScope = all.filter((r) => agent.scope.includes(r.item.topic));
  const bestOverall = all[0].score;
  const bestInScope = inScope[0]?.score ?? 0;

  const chosen = bestInScope >= bestOverall * 0.6 && inScope.length ? inScope : all;
  return chosen.map((r) => ({ entry: r.item, score: r.score }));
}

/* --------------------------------------------------------------- empathy -- */

const WORRY =
  /\b(nervous|anxious|worried|worry|scared|afraid|guilt|guilty|hard|difficult|struggl|cry|crying|upset|stress|overwhelm|first time|never left|not ready)\b/i;

const EMPATHY = [
  'That worry is completely normal, and honestly it says something good about you.',
  'You are not the first parent to feel that, and you will not be the last.',
  'That is one of the hardest parts of this decision — it is worth taking seriously.',
];

/** Deterministic pick so the same message always produces the same reply. */
function pickEmpathy(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return EMPATHY[h % EMPATHY.length];
}

/** verified > general > unknown. Returns whichever is weakest. */
const TRUST_RANK: Record<Trust, number> = { verified: 2, general: 1, unknown: 0 };

function leastAuthoritative(a: Trust, b: Trust): Trust {
  return TRUST_RANK[a] <= TRUST_RANK[b] ? a : b;
}

/* ---------------------------------------------------------------- compose -- */

const HANDOFF_ACTIONS: Action[] = [
  { label: `Call ${site.phone.label}`, href: site.phone.href, kind: 'primary' },
  { label: 'Book a tour', href: '/enroll/book-a-tour', kind: 'secondary' },
];

function actionsFor(entry: Entry | undefined, agent: Agent, trust: Trust): Action[] {
  const out: Action[] = [];

  if (entry?.links?.length) {
    entry.links.forEach((l, i) =>
      out.push({ label: l.label, href: l.href, kind: i === 0 ? 'primary' : 'secondary' })
    );
  }

  if (trust === 'unknown') {
    if (!out.some((a) => a.href === site.phone.href)) {
      out.push({ label: `Call ${site.phone.label}`, href: site.phone.href, kind: out.length ? 'secondary' : 'primary' });
    }
  }

  // Every conversation keeps a route to a visit, without repeating it if present.
  const hasTour = out.some((a) => a.href.includes('book-a-tour'));
  if (!hasTour && agent.id !== 'careers' && out.length < 3) {
    out.push({ label: 'Book a tour', href: '/enroll/book-a-tour', kind: out.length ? 'secondary' : 'primary' });
  }

  return out.slice(0, 3);
}

function followUpsFor(agent: Agent, entry?: Entry): string[] {
  const byAgent: Record<AgentId, string[]> = {
    concierge: ['What programs do you offer?', 'How do I book a tour?', 'Is Tiny Stars licensed?'],
    'program-advisor': ['What does a typical day look like?', 'How do I book a tour?', 'How does enrolment work?'],
    enrollment: ['What does the registration package ask for?', 'How does the waitlist work?', 'How do I book a tour?'],
    tour: ['What should I look for on a tour?', 'How long does a tour take?', 'Where are you located?'],
    'trust-safety': ['Are there cameras in the daycare?', 'Where can I read your policies?', 'What happens if I am late?'],
    faq: ['What time do you close?', 'How does nap time work?', 'My child cries at drop-off. What helps?'],
    'family-resource': ['How do I prepare for the first day?', 'Where can I read your policies?', 'What should I look for on a tour?'],
    careers: ['How do I apply for a job?', 'What positions are open?', 'Where are you located?'],
    content: [], feedback: [], analytics: [], seo: [], operations: [],
  };

  const base = byAgent[agent.id] ?? byAgent.concierge;
  return base.filter((q) => q.toLowerCase() !== entry?.question.toLowerCase()).slice(0, 3);
}

/* --------------------------------------------------------------- provider -- */

const localProvider: AIProvider = {
  id: 'local',
  label: 'On-device knowledge base',
  requiresNetwork: false,
  costPerTurn: 'free',

  async respond(req: AIRequest): Promise<AIResponse> {
    const check = checkInput(req.message);

    if (!check.safe) {
      return {
        text: check.refusal!,
        trust: 'unknown',
        sources: [],
        actions: HANDOFF_ACTIONS,
        agent: 'concierge',
        handoff: true,
        confidence: 1,
        followUps: [],
        flags: check.flags,
      };
    }

    const message = check.cleaned;

    const chat = smallTalk(message);
    if (chat) {
      return {
        text: chat.reply,
        // Nothing here is a claim about the centre, so there is nothing to source.
        trust: 'general',
        sources: [],
        actions: [{ label: 'Book a tour', href: '/enroll/book-a-tour', kind: 'primary' }],
        agent: 'concierge',
        handoff: false,
        confidence: 1,
        followUps: chat.followUps,
        flags: [...check.flags, 'small-talk'],
      };
    }

    const { agent, score: routeScore } = routeToAgent(message, req.context);
    const hits = retrieve(message, agent);
    const top = hits[0];

    const ageMonths = parseAge(message) ?? req.context.ageMonths;
    const worried = WORRY.test(message);

    const parts: string[] = [];
    const sources: Source[] = [];
    // Contributions, not a running value. Seeding this as 'unknown' and then
    // taking the least authoritative meant the seed always won: "what programs
    // do you offer" came back sourced, confidence 0.95, and labelled unknown —
    // so it also handed off. Only what actually contributed gets a vote.
    const trustParts: Trust[] = [];
    let confidence = 0;

    if (worried) parts.push(pickEmpathy(message));

    // --- age-aware program answer, layered on top of retrieval ---------------
    // Only when the question is actually about placement. An age appearing in a
    // sentence is not a request for one: "is it normal for a 2 year old to
    // bite?" was being answered with "a 2-year-old sits in Comet Stars", which
    // reads as though the question was not listened to.
    const PLACEMENT =
      /\b(program|programme|group|room|class|which|what.{0,12}(?:group|program|room)|where.{0,10}(?:start|go|begin)|start|join|enrol|enroll|register|fit|right for|suitable|belong|old enough|age)\b/i;
    const asksPlacement = PLACEMENT.test(message) || hits.length === 0;

    if (ageMonths !== null && ageMonths !== undefined && asksPlacement) {
      const program = programForAgeMonths(ageMonths);
      if (program) {
        const yrs = ageMonths >= 24 ? `${Math.floor(ageMonths / 12)}` : `${ageMonths} month`;
        const unit = ageMonths >= 24 ? '-year-old' : '-old';
        parts.push(
          `A ${yrs}${unit} sits in **${program.name}** (${program.familiar}, ${program.ageLabel}).`
        );
        sources.push({ label: 'Tiny Stars — Our Programs', href: `/programs/${program.slug}` });
        trustParts.push('verified');
        confidence = Math.max(confidence, 0.85);
      } else if (ageMonths < 12) {
        parts.push(
          'The youngest program Tiny Stars lists is Twinkle Stars, which starts at 12 months. Whether younger babies can be accommodated is not published, so the team is the right place to ask.'
        );
        trustParts.push('unknown');
        confidence = 0.8;
      }
    }

    // --- knowledge-base answer ----------------------------------------------
    if (top && top.score > 0.9) {
      parts.push(top.entry.answer);
      // When an answer mixes a verified fact with general guidance, label it by the
      // LEAST authoritative part present. Saying "from Tiny Stars" over a paragraph
      // that is partly our own advice would be the exact failure this site avoids.
      trustParts.push(top.entry.trust);
      confidence = Math.max(confidence, Math.min(0.95, 0.45 + top.score / 12));
      if (top.entry.source) sources.push({ label: top.entry.source });
    } else if (!parts.length) {
      // Nothing matched well. Say so plainly, then be useful anyway.
      parts.push(
        'I do not have a confident answer to that one from what Tiny Stars has published — and I would rather tell you that than guess.'
      );
      const suggestions = knowledge
        .filter((e) => e.trust === 'verified')
        .slice(0, 3)
        .map((e) => e.question);
      parts.push(
        `Things I can answer well: ${suggestions.join(' · ')}. For anything else, the team will know.`
      );
      trustParts.push('unknown');
      confidence = 0.2;
    }

    if (worried && ageMonths != null && !hits.length) {
      parts.push(
        'If it helps, the Family Hub has a short guide on settling in and what the first two weeks usually look like.'
      );
    }

    // Least authoritative of what actually contributed. Nothing contributing at
    // all means nothing was found, which is genuinely 'unknown'.
    let trust: Trust = trustParts.length
      ? trustParts.reduce((a, b) => leastAuthoritative(a, b))
      : 'unknown';

    let text = parts.join('\n\n');

    // --- output guardrail ----------------------------------------------------
    const out = checkOutput(text, sources.length > 0);
    const flags = [...check.flags];
    if (!out.ok) {
      text = out.text;
      // An override, not a contribution: a blocked answer is unknown whatever
      // else was in the mix.
      trust = 'unknown';
      confidence = 0.3;
      flags.push(`blocked:${out.violation}`);
    }

    const handoff = trust === 'unknown' || confidence < 0.35;

    // What should the page point at? Derived from what was actually retrieved,
    // never from the question alone — pointing at the wrong thing while saying
    // "I don't know" would be worse than pointing at nothing.
    const spotlight: AIResponse['spotlight'] = {};
    if (top?.entry) {
      const node = nodeForTopic(top.entry.topic);
      if (node) spotlight.node = node;
    }
    const zone = zoneForKeyword(message);
    if (zone) {
      spotlight.zone = zone;
      spotlight.node ??= 'day';
    }
    if (ageMonths != null) {
      const p = programForAgeMonths(ageMonths);
      if (p) {
        spotlight.program = p.slug;
        spotlight.node ??= 'programs';
      }
    }

    return {
      text,
      trust,
      sources,
      actions: handoff && !top ? HANDOFF_ACTIONS : actionsFor(top?.entry, agent, trust),
      agent: agent.id,
      handoff,
      confidence: Math.round(confidence * 100) / 100,
      followUps: followUpsFor(agent, top?.entry),
      spotlight: Object.keys(spotlight).length ? spotlight : undefined,
      flags: routeScore < 1 ? [...flags, 'low-route-confidence'] : flags,
    };
  },
};

registerProvider(localProvider);

export { localProvider };

/** Quick-action chips shown before the visitor types anything. */
export const quickActions = [
  { label: 'Find my program', message: 'Which program is right for my child?' },
  { label: 'Book a tour', message: 'How do I book a tour?' },
  { label: 'How enrolment works', message: 'How does enrolment work?' },
  { label: 'Safety questions', message: 'How does Tiny Stars keep children safe?' },
  { label: 'What a day looks like', message: 'What does a typical day look like?' },
  { label: 'Talk to the team', message: 'How do I contact Tiny Stars?' },
];

/** Rotating prompts shown as placeholder text — real questions, not marketing. */
export const samplePrompts = [
  'My child is 2 and I am looking for full-time care',
  'What time do you close?',
  'Are there cameras in the daycare?',
  'I am nervous about my first drop-off',
  'What should I ask on a tour?',
];

export { programs };
