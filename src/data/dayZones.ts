/**
 * The eight moments of a Tiny Stars day, as both HTML content and 3D camera
 * routes. One list drives the buttons, the panel copy, the hotspot markers and
 * where the camera flies — so they cannot drift apart.
 *
 * `trust` carries the same discipline as the rest of the site: `verified` means
 * Tiny Stars published it, `general` means we wrote it as early-childhood
 * context. No clock times appear anywhere, because Tiny Stars publishes its
 * schedule in a document rather than on the web, and inventing one would be a
 * fabrication dressed up as a feature.
 */

export interface DayZone {
  id: string;
  label: string;
  icon: string;
  /** Short line for the hotspot tooltip. */
  hint: string;
  body: string;
  trust: 'verified' | 'general';
  source?: string;
  /** Camera position in scene units. */
  cam: [number, number, number];
  /** Where the camera looks. */
  look: [number, number, number];
  /** Hotspot marker position. */
  at: [number, number, number];
  color: number;
}

export const dayZones: DayZone[] = [
  {
    id: 'arrival',
    label: 'Arrival',
    icon: 'sun',
    hint: 'The handover at the door',
    body: 'The hardest two minutes of the day, and the ones a good routine fixes fastest. A short, predictable goodbye works better than a long one — and far better than slipping away unseen.',
    trust: 'general',
    cam: [-5.2, 2.4, 5.6],
    look: [-3.4, 0.9, 0.4],
    at: [-3.9, 1.1, 1.1],
    color: 0xe5992a,
  },
  {
    id: 'learning',
    label: 'Learning',
    icon: 'bulb',
    hint: 'Age-appropriate activities',
    body: 'Tiny Stars describes a well-rounded approach to early learning, with age-appropriate activities that support cognitive, social and emotional growth.',
    trust: 'verified',
    source: 'tinystars.ca — Learning & Development',
    cam: [-1.4, 2.6, 5.2],
    look: [-0.6, 0.8, -0.6],
    at: [-0.9, 1.0, -0.9],
    color: 0x3d8fc9,
  },
  {
    id: 'play',
    label: 'Play',
    icon: 'puzzle',
    hint: 'Blocks, building, knocking down',
    body: 'Toddlers learn with their whole body. Climbing, pouring, stacking and knocking down is the curriculum, not a break from it.',
    trust: 'general',
    cam: [2.6, 2.2, 5.0],
    look: [1.6, 0.6, -0.2],
    at: [1.8, 0.5, -0.4],
    color: 0xf4703f,
  },
  {
    id: 'creative',
    label: 'Creative time',
    icon: 'palette',
    hint: 'Making things, deciding they are finished',
    body: 'Process over product. Twenty minutes of concentration at an easel is a long time at two, and it is the concentration that matters more than what comes home.',
    trust: 'general',
    cam: [5.0, 2.4, 3.8],
    look: [3.6, 1.0, -1.2],
    at: [3.9, 1.2, -1.5],
    color: 0x8163cf,
  },
  {
    id: 'outdoor',
    label: 'Outdoor',
    icon: 'leaf',
    hint: 'The fenced play area',
    body: 'Tiny Stars has a fenced outdoor play area on artificial turf, with a climbing structure and picnic seating. There is also an indoor gross-motor room for days the weather does not allow it.',
    trust: 'verified',
    source: 'Tiny Stars gallery photography',
    cam: [6.4, 3.0, 1.2],
    look: [5.4, 0.4, -2.6],
    at: [5.6, 0.5, -2.9],
    color: 0x2d7a6c,
  },
  {
    id: 'meal',
    label: 'Meals',
    icon: 'apple',
    hint: 'The table where food happens',
    body: 'Meals and snacks sit in the published Classroom Routine, and Food Services is a section of the registration package. Menus are not published online — ask to see the current one on your tour.',
    trust: 'verified',
    source: 'Tiny Stars Classroom Routine',
    cam: [1.0, 2.8, 6.2],
    look: [0.4, 0.5, 1.6],
    at: [0.5, 0.6, 1.4],
    color: 0xe0678b,
  },
  {
    id: 'rest',
    label: 'Rest',
    icon: 'moon',
    hint: 'Quiet time, built in',
    body: 'Rest sits in the published routine alongside meals, play and activities. Children starting kindergarten are often at their most tired in the late afternoon — downtime is not wasted time.',
    trust: 'verified',
    source: 'Tiny Stars Classroom Routine',
    cam: [-4.6, 2.0, 3.0],
    look: [-4.2, 0.4, -1.8],
    at: [-4.4, 0.4, -2.0],
    color: 0x6a6785,
  },
  {
    id: 'pickup',
    label: 'Pick-up',
    icon: 'heart',
    hint: 'Tiny Stars closes at 6:00 PM',
    body: 'The centre closes at 6:00 PM. Late collection is $1.00 per minute from 6:01–6:15 PM and $2.00 per minute from 6:16–6:30 PM, per child, paid to the educator who stayed late.',
    trust: 'verified',
    source: 'Tiny Stars registration package',
    cam: [-6.0, 2.2, 6.0],
    look: [-3.4, 0.9, 0.4],
    at: [-3.9, 1.1, 1.1],
    color: 0xf2be4c,
  },
];

export function zoneById(id: string): DayZone | undefined {
  return dayZones.find((z) => z.id === id);
}

/** Lets the concierge fly the camera when an answer is about part of the day. */
export function zoneForKeyword(text: string): string | null {
  const t = text.toLowerCase();
  const table: [RegExp, string][] = [
    [/\b(drop[- ]?off|arriv|goodbye|morning|settl)/, 'arrival'],
    [/\b(learn|curricul|activit|develop|school ready)/, 'learning'],
    [/\b(play|block|toy|gross[- ]?motor)/, 'play'],
    [/\b(art|creat|paint|craft|music)/, 'creative'],
    [/\b(outdoor|outside|playground|fresh air|garden)/, 'outdoor'],
    [/\b(meal|food|lunch|snack|eat|menu|allerg)/, 'meal'],
    [/\b(nap|sleep|rest|quiet)/, 'rest'],
    [/\b(pick[- ]?up|collect|close|late|6 ?pm|home time)/, 'pickup'],
  ];
  for (const [re, id] of table) if (re.test(t)) return id;
  return null;
}
