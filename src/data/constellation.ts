/**
 * The constellation.
 *
 * One source of truth for the 3D star map, the HTML navigation underneath it,
 * and the AI's ability to point at things. If a node moves, everything moves
 * together — there is no second list to forget to update.
 *
 * `angle` is where the node sits on the ring, in degrees clockwise from top.
 * `radius` lets a couple of nodes sit further out so the shape reads as a
 * constellation rather than a clock face.
 */

export interface ConstellationNode {
  id: string;
  label: string;
  /** One line, shown on hover and in the HTML list. */
  blurb: string;
  href: string;
  icon: string;
  /** Hex, matching the 2D palette. */
  color: number;
  angle: number;
  radius: number;
  /** Nodes this one is drawn connected to. Bidirectional; list once. */
  links: string[];
}

export const CORE = {
  id: 'core',
  label: 'Tiny Stars',
  color: 0xf2be4c,
};

export const constellation: ConstellationNode[] = [
  {
    id: 'programs',
    label: 'Programs',
    blurb: 'Five age groups, 12 months to 12 years',
    href: '/programs',
    icon: 'compass',
    color: 0x4fa896,
    angle: 0,
    radius: 3.5,
    links: ['learning', 'enroll'],
  },
  {
    id: 'safety',
    label: 'Trust & safety',
    blurb: 'Every published policy, with its source',
    href: '/why/trust-centre',
    icon: 'shield',
    color: 0x3d8fc9,
    angle: 60,
    radius: 3.9,
    links: ['day'],
  },
  {
    id: 'day',
    label: 'Their day',
    blurb: 'What happens between goodbye and hello',
    href: '/day',
    icon: 'sun',
    color: 0xe5992a,
    angle: 120,
    radius: 3.4,
    links: ['experience'],
  },
  {
    id: 'experience',
    label: 'See the rooms',
    blurb: 'Real photographs and video of the spaces',
    href: '/experience/virtual-tour',
    icon: 'camera',
    color: 0x8163cf,
    angle: 180,
    radius: 3.8,
    links: ['family'],
  },
  {
    id: 'family',
    label: 'For families',
    blurb: 'Guides, documents and answers',
    href: '/families/hub',
    icon: 'heart',
    color: 0xe0678b,
    angle: 240,
    radius: 3.4,
    links: ['enroll'],
  },
  {
    id: 'enroll',
    label: 'Book a tour',
    blurb: 'Thirty minutes, in person',
    href: '/enroll/book-a-tour',
    icon: 'calendar',
    color: 0xf4703f,
    angle: 300,
    radius: 4.1,
    links: ['programs'],
  },
];

export function nodeById(id: string): ConstellationNode | undefined {
  return constellation.find((n) => n.id === id);
}

/**
 * Maps a concierge topic onto a constellation node, so the assistant can point
 * at the right star when it answers. Returns null when nothing sensible fits —
 * pointing at the wrong thing is worse than pointing at nothing.
 */
export function nodeForTopic(topic: string): string | null {
  const map: Record<string, string> = {
    programs: 'programs',
    safety: 'safety',
    policies: 'safety',
    'daily-life': 'day',
    tours: 'enroll',
    enrollment: 'enroll',
    families: 'family',
  };
  return map[topic] ?? null;
}
