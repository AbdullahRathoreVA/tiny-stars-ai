/**
 * The centre's own photographs and clips.
 *
 * Everything here was taken at Tiny Stars and supplied by the centre. Derivatives
 * are produced by `scripts/media.py`, which strips EXIF — phone photos carry GPS
 * and device serials, and the location of a daycare should not ride along in the
 * file.
 *
 * Two flags carry the judgement calls:
 *
 * - `people: 'children'` marks anything showing identifiable children. Publishing
 *   those depends on the centre holding photo releases from each family, which is
 *   the centre's call and not something the site can verify. `SHOW_CHILDREN`
 *   below is the single switch that governs all of it, so it can be turned off in
 *   one edit without touching a page.
 * - `generated: true` marks footage that is not real. One supplied clip is an
 *   AI-generated brand reel: the storefront, the staff and the children in it do
 *   not exist. It is labelled wherever it appears and never used as evidence of
 *   the rooms, because the whole point of this site is that a parent can tell the
 *   difference.
 */

export type MediaKind = 'photo' | 'video';
export type MediaPeople = 'children' | 'adults' | 'none';
export type MediaTopic = 'rooms' | 'playground' | 'outings' | 'activities' | 'brand';

export interface MediaItem {
  id: string;
  kind: MediaKind;
  /** Alt text for a photo, or the accessible description of a video. */
  alt: string;
  /** Short human caption shown under the item. */
  caption: string;
  topic: MediaTopic;
  people: MediaPeople;
  /** Intrinsic size of the largest rendition, for aspect-ratio boxes. */
  w: number;
  h: number;
  /** Seconds. Videos only. */
  dur?: number;
  /** Not real footage. Always labelled in the UI. */
  generated?: boolean;
}

/**
 * Master switch for anything showing identifiable children. Flip to `false` and
 * every surface on the site falls back to rooms, playground and spaces only.
 */
export const SHOW_CHILDREN = true;

const BASE = '/assets/media';

export const photoSrc = (id: string, width: 700 | 1400 = 1400) =>
  `${BASE}/photos/${id}-${width}.webp`;
export const videoSrc = (id: string) => `${BASE}/video/${id}.mp4`;
export const posterSrc = (id: string) => `${BASE}/posters/${id}.webp`;

export const media: MediaItem[] = [
  // ------------------------------------------------------------ rooms --
  {
    id: 'ts-05',
    kind: 'photo',
    alt: 'A Tiny Stars classroom with a painted rainbow and cloud mural along one wall, low wooden shelves of toys, a round alphabet rug and a high chair.',
    caption: 'A room set up and waiting, before the day starts',
    topic: 'rooms',
    people: 'none',
    w: 1050,
    h: 1400,
  },
  {
    id: 'ts-06',
    kind: 'photo',
    alt: 'A Tiny Stars classroom with a large storybook landscape mural, child-height tables and chairs, and an activity table with coloured squares.',
    caption: 'Tables at child height, and a wall worth staring at',
    topic: 'rooms',
    people: 'none',
    w: 1050,
    h: 1400,
  },

  // ------------------------------------------------------- playground --
  {
    id: 'ts-08',
    kind: 'photo',
    alt: 'Children and educators playing on the green turf of the fenced outdoor playground, with climbing equipment and ride-on toys.',
    caption: 'The fenced yard on a clear afternoon',
    topic: 'playground',
    people: 'children',
    w: 1280,
    h: 960,
  },
  {
    id: 'ts-09',
    kind: 'photo',
    alt: 'Educators and children running and playing beside the climbing frame and slide on the outdoor playground.',
    caption: 'Running, which is most of the job',
    topic: 'playground',
    people: 'children',
    w: 1280,
    h: 960,
  },
  {
    id: 'ts-26',
    kind: 'video',
    alt: 'Slow pan across the outdoor playground: a climbing frame, slides, a playhouse and turf, with no one in shot.',
    caption: 'The yard, end to end',
    topic: 'playground',
    people: 'none',
    w: 576,
    h: 1024,
    dur: 15.8,
  },
  {
    id: 'ts-25',
    kind: 'video',
    alt: 'Children playing around a plastic playhouse and slide on the outdoor turf while an educator supervises.',
    caption: 'Free play in the yard',
    topic: 'playground',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 4.8,
  },
  {
    id: 'ts-18',
    kind: 'video',
    alt: 'Wide view of the playground with children on the climbing equipment and educators nearby.',
    caption: 'Afternoon outside',
    topic: 'playground',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 15.6,
  },

  // ---------------------------------------------------------- outings --
  {
    id: 'ts-02',
    kind: 'photo',
    alt: 'A group of toddlers in yellow Tiny Stars shirts playing on the grass beside the centre’s wagons at a park, with educators standing with them.',
    caption: 'A park morning, yellow shirts everywhere',
    topic: 'outings',
    people: 'children',
    w: 1400,
    h: 1050,
  },
  {
    id: 'ts-01',
    kind: 'photo',
    alt: 'Wagons parked on the grass at a park, decorated with a Happy Birthday banner and paper fans, with a child sitting alongside.',
    caption: 'Somebody had a birthday',
    topic: 'outings',
    people: 'children',
    w: 1050,
    h: 1400,
  },
  {
    id: 'ts-04',
    kind: 'photo',
    alt: 'Children in yellow shirts gathered around a blanket of party things beside the wagons, with educators helping.',
    caption: 'Unwrapping, supervised',
    topic: 'outings',
    people: 'children',
    w: 1400,
    h: 1050,
  },
  {
    id: 'ts-07',
    kind: 'photo',
    alt: 'An educator settling toddlers into a six-seat walking wagon on the pavement outside the centre.',
    caption: 'Loading up for a walk',
    topic: 'outings',
    people: 'children',
    w: 1050,
    h: 1400,
  },
  {
    id: 'ts-12',
    kind: 'video',
    alt: 'Educators pushing wagons of toddlers across the grass at a park.',
    caption: 'Wagons on the move',
    topic: 'outings',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 3.9,
  },
  {
    id: 'ts-16',
    kind: 'video',
    alt: 'A child in a yellow shirt stepping onto a yellow school bus while an educator holds the rail.',
    caption: 'Boarding the bus',
    topic: 'outings',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 4.7,
  },

  // ------------------------------------------------------- activities --
  {
    id: 'ts-31',
    kind: 'video',
    alt: 'An educator kneeling on the turf holding a rabbit while children reach out to stroke it.',
    caption: 'Meeting the rabbit',
    topic: 'activities',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 1.7,
  },
  {
    id: 'ts-28',
    kind: 'video',
    alt: 'Close view of a craft table: paper plates of beads and cut paper shapes, with children’s hands threading and cutting.',
    caption: 'Beads, scissors, concentration',
    topic: 'activities',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 2.4,
  },
  {
    id: 'ts-29',
    kind: 'video',
    alt: 'Children seated around a low table working on a bead and paper craft with an educator alongside.',
    caption: 'Craft table, mid-project',
    topic: 'activities',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 2.0,
  },
  {
    id: 'ts-30',
    kind: 'video',
    alt: 'Children drawing and colouring at an outdoor table covered with paper and marker pens.',
    caption: 'Drawing outside',
    topic: 'activities',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 3.6,
  },
  {
    id: 'ts-27',
    kind: 'video',
    alt: 'Children standing at a bright party table with paper cups, decorating and helping.',
    caption: 'Party table',
    topic: 'activities',
    people: 'children',
    w: 576,
    h: 1024,
    dur: 2.5,
  },

  // ------------------------------------------------------------ brand --
  {
    id: 'ts-15',
    kind: 'video',
    alt: 'A short reel of the Tiny Stars spaces: the playground, the mural rooms and a rainbow over the yard, captioned “A Place Where Little Stars Begin to Shine”.',
    caption: 'The spaces, in ten seconds',
    topic: 'brand',
    people: 'none',
    w: 406,
    h: 720,
    dur: 10,
  },
  {
    id: 'ts-14',
    kind: 'video',
    alt: 'An educator crouching to greet a toddler on a classroom rug, captioned “A Place Where Little Stars Begin to Shine”.',
    caption: 'Hello, at eye level',
    topic: 'brand',
    people: 'children',
    w: 406,
    h: 720,
    dur: 10,
  },
  {
    id: 'ts-32',
    kind: 'video',
    alt: 'An AI-generated promotional reel showing an imagined Tiny Stars storefront and classroom scenes.',
    caption: 'Brand reel — AI-generated, not the real centre',
    topic: 'brand',
    people: 'children',
    w: 406,
    h: 720,
    dur: 10,
    generated: true,
  },
];

/** Everything publishable given the children switch. */
export const publishable = (): MediaItem[] =>
  media.filter((m) => SHOW_CHILDREN || m.people !== 'children');

/**
 * The homepage strip. Ordered to open warm and stay varied, and deliberately
 * short: a parent deciding in thirty seconds needs a taste, not the archive.
 * Generated footage is never in here — the strip's job is to show the real place.
 */
export const FEATURED_IDS = ['ts-15', 'ts-05', 'ts-02', 'ts-31', 'ts-06', 'ts-09', 'ts-28', 'ts-26'];

export const featured = (): MediaItem[] => {
  const pool = publishable().filter((m) => !m.generated);
  const picked = FEATURED_IDS.map((id) => pool.find((m) => m.id === id)).filter(
    (m): m is MediaItem => Boolean(m)
  );
  // If the children switch is off, the curated list thins out — top it back up
  // from whatever is left so the strip never renders half empty.
  if (picked.length >= 6) return picked;
  const extra = pool.filter((m) => !picked.includes(m));
  return [...picked, ...extra].slice(0, 8);
};

export const byTopic = (topic: MediaTopic): MediaItem[] =>
  publishable().filter((m) => m.topic === topic);
