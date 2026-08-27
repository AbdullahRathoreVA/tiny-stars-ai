/**
 * The Tiny Stars agent ecosystem.
 *
 * Each agent is a narrow specialist: a slice of the knowledge base, a set of intent
 * triggers, and a house style for how it answers. The orchestrator picks exactly one
 * per turn. Adding an agent means adding an entry here — no routing code changes.
 *
 * Agents marked `live: false` are architecture, not implementation: they describe
 * where this system is going. The Command Centre shows that distinction plainly
 * rather than pretending twelve autonomous agents are running.
 */

import type { Topic, Trust } from '../../data/knowledge';

export type AgentId =
  | 'concierge'
  | 'program-advisor'
  | 'enrollment'
  | 'tour'
  | 'faq'
  | 'trust-safety'
  | 'family-resource'
  | 'careers'
  | 'content'
  | 'feedback'
  | 'analytics'
  | 'seo'
  | 'operations';

export interface Agent {
  id: AgentId;
  name: string;
  role: string;
  /** One-line description for the Command Centre. */
  description: string;
  /** Knowledge topics this agent is allowed to answer from. */
  scope: Topic[];
  /** Words that pull a message toward this agent. Weighted by position. */
  triggers: string[];
  /** Opening line style — keeps each agent recognisably itself. */
  voice: string;
  icon: string;
  accent: string;
  /** Whether the agent actually executes in this build. */
  live: boolean;
  /** What it would need to go live. Shown in the Command Centre. */
  needs?: string;
}

export const agents: Agent[] = [
  {
    id: 'concierge',
    name: 'Family Concierge',
    role: 'Front door',
    description:
      'Greets every visitor, works out what they actually need, and hands off to the right specialist.',
    scope: ['programs', 'enrollment', 'tours', 'safety', 'daily-life', 'policies', 'contact', 'families'],
    triggers: ['help', 'hello', 'hi', 'start', 'looking', 'need', 'advice', 'where do i begin'],
    voice: 'warm, brief, always offers a next step',
    icon: 'sparkles',
    accent: 'coral',
    live: true,
  },
  {
    id: 'program-advisor',
    name: 'Program Advisor',
    role: 'Age & fit',
    description:
      'Maps a child’s age and a family’s priorities onto the right Tiny Stars program. Never invents program details.',
    scope: ['programs'],
    triggers: [
      'program', 'age', 'old', 'month', 'year', 'toddler', 'infant', 'baby', 'preschool',
      'kindergarten', 'school age', 'twinkle', 'comet', 'nova', 'galaxy', 'cosmic',
      'enrichment', 'class', 'which room', 'group',
    ],
    voice: 'concrete, always names the program and the age band',
    icon: 'compass',
    accent: 'teal',
    live: true,
  },
  {
    id: 'enrollment',
    name: 'Enrolment Guide',
    role: 'Paperwork & steps',
    description:
      'Explains the registration package, the waitlist and the order of steps. Refuses to state fees or availability.',
    scope: ['enrollment'],
    triggers: [
      'enrol', 'enroll', 'register', 'registration', 'sign up', 'join', 'apply', 'paperwork',
      'form', 'document', 'waitlist', 'wait list', 'start date', 'cost', 'price', 'fee',
      'tuition', 'availability', 'space', 'spot', 'opening', 'subsidy',
    ],
    voice: 'step-by-step, sets expectations, never guesses a number',
    icon: 'route',
    accent: 'marigold',
    live: true,
  },
  {
    id: 'tour',
    name: 'Tour Assistant',
    role: 'Visits',
    description:
      'Gets families booked in and prepared. Knows tours are 30 minutes and never claims a booking is confirmed.',
    scope: ['tours'],
    triggers: [
      'tour', 'visit', 'see', 'look around', 'come in', 'appointment', 'book', 'viewing',
      'walk through', 'meet', 'prepare', 'checklist',
    ],
    voice: 'practical, gets to the booking without pushing',
    icon: 'calendar',
    accent: 'violet',
    live: true,
  },
  {
    id: 'trust-safety',
    name: 'Trust & Safety',
    role: 'Verified facts',
    description:
      'Answers safety, licensing and policy questions strictly from published Tiny Stars documents, with the source attached.',
    scope: ['safety', 'policies'],
    triggers: [
      'safe', 'safety', 'secure', 'security', 'licence', 'license', 'insured', 'camera',
      'surveillance', 'ratio', 'policy', 'sick', 'illness', 'medication', 'allergy',
      'emergency', 'pickup', 'supervision', 'handbook', 'trust', 'worried', 'concern',
    ],
    voice: 'precise, cites the document, says "not published" without flinching',
    icon: 'shield',
    accent: 'sky',
    live: true,
  },
  {
    id: 'faq',
    name: 'Everyday Questions',
    role: 'Daily life',
    description:
      'Handles the rhythm of the day — meals, rest, routine, drop-off — and points at the Classroom Routine.',
    scope: ['daily-life', 'families'],
    triggers: [
      'day', 'daily', 'routine', 'schedule', 'nap', 'sleep', 'rest', 'food', 'meal', 'lunch',
      'snack', 'menu', 'eat', 'hours', 'close', 'open', 'time', 'drop off', 'crying', 'settle',
      'outdoor', 'play',
    ],
    voice: 'reassuring, separates general guidance from Tiny Stars policy',
    icon: 'clock',
    accent: 'blush',
    live: true,
  },
  {
    id: 'family-resource',
    name: 'Family Resources',
    role: 'Guides & documents',
    description: 'Finds the right guide, checklist or policy PDF for where a family is right now.',
    scope: ['families', 'policies'],
    triggers: ['guide', 'resource', 'download', 'pdf', 'handbook', 'first day', 'prepare', 'transition', 'tips'],
    voice: 'points at one specific resource, not a list of ten',
    icon: 'book',
    accent: 'teal',
    live: true,
  },
  {
    id: 'careers',
    name: 'Careers',
    role: 'Educators',
    description: 'Handles job seekers separately from families so neither experience gets diluted.',
    scope: ['careers'],
    triggers: ['job', 'career', 'hiring', 'work', 'employment', 'apply', 'resume', 'wage', 'position', 'educator role'],
    voice: 'direct, respects that this is a different visitor entirely',
    icon: 'users',
    accent: 'marigold',
    live: true,
  },
  {
    id: 'content',
    name: 'Content Agent',
    role: 'Knowledge base',
    description:
      'Keeps the knowledge base in sync with the site and flags answers that have gone stale.',
    scope: [],
    triggers: [],
    voice: 'internal',
    icon: 'file',
    accent: 'sky',
    live: false,
    needs: 'A scheduled crawl of tinystars.ca plus a diff against this knowledge base.',
  },
  {
    id: 'feedback',
    name: 'Feedback Agent',
    role: 'Listening',
    description: 'Groups what families ask and where they get stuck, so gaps get fixed rather than argued about.',
    scope: [],
    triggers: [],
    voice: 'internal',
    icon: 'chat',
    accent: 'blush',
    live: false,
    needs: 'A durable store for questions the concierge could not answer.',
  },
  {
    id: 'analytics',
    name: 'Analytics Agent',
    role: 'Funnel',
    description:
      'Watches the tour and enrolment funnel for drop-off. Reads only anonymous, non-identifying events.',
    scope: [],
    triggers: [],
    voice: 'internal',
    icon: 'activity',
    accent: 'teal',
    live: false,
    needs: 'A privacy-preserving analytics sink. The event schema already exists.',
  },
  {
    id: 'seo',
    name: 'Discovery Agent',
    role: 'Search',
    description: 'Tracks how families find Tiny Stars locally and which questions have no page yet.',
    scope: [],
    triggers: [],
    voice: 'internal',
    icon: 'search',
    accent: 'violet',
    live: false,
    needs: 'Search Console access for tinystars.ca.',
  },
  {
    id: 'operations',
    name: 'Operations Agent',
    role: 'Staff workflows',
    description: 'Would route tour requests, waitlist entries and enquiries to the right person on the team.',
    scope: [],
    triggers: [],
    voice: 'internal',
    icon: 'network',
    accent: 'coral',
    live: false,
    needs: 'A CRM or inbox integration, and a decision about who owns which queue.',
  },
];

export const liveAgents = agents.filter((a) => a.live);
export const futureAgents = agents.filter((a) => !a.live);

export function agentById(id: AgentId): Agent {
  return agents.find((a) => a.id === id) ?? agents[0];
}

/** How an agent should frame an answer given the trust level it retrieved. */
export const trustFraming: Record<Trust, { prefix: string; label: string }> = {
  verified: { prefix: '', label: 'From Tiny Stars' },
  general: { prefix: '', label: 'General guidance' },
  unknown: { prefix: '', label: 'Not published — ask the team' },
};
