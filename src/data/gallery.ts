/**
 * Gallery.
 *
 * Every photograph is Tiny Stars' own, mirrored from tinystars.ca. Each caption
 * describes what is actually visible in the frame — written after looking at each
 * image, not generated from a filename. No image is captioned with an activity or
 * a claim the photograph does not show.
 *
 * Note: the Tiny Stars gallery is entirely photographs of the spaces. No children
 * appear in any of them, which is why no caption mentions one.
 */

export type GalleryCategory =
  | 'classrooms'
  | 'play'
  | 'outdoors'
  | 'kitchen'
  | 'around';

export interface Photo {
  src: string;
  alt: string;
  caption: string;
  category: GalleryCategory;
  /** Wider images get a two-column span in the masonry grid. */
  wide?: boolean;
}

export const categoryLabels: Record<GalleryCategory, string> = {
  classrooms: 'Classrooms',
  play: 'Play spaces',
  outdoors: 'Outdoors',
  kitchen: 'Kitchen & dining',
  around: 'Around the centre',
};

const g = (n: number) => `/assets/images/gallery/gallery-${n}.webp`;

export const photos: Photo[] = [
  {
    src: g(1),
    alt: 'A commercial kitchen with two stainless steel ovens, a marble-patterned backsplash and pale green cabinetry',
    caption: 'The kitchen, with double ovens and full-height storage.',
    category: 'kitchen',
  },
  {
    src: g(2),
    alt: 'An outdoor play area with a large multi-coloured climbing structure and slide on artificial turf, enclosed by a tall wooden fence',
    caption: 'The fenced outdoor play area, on artificial turf.',
    category: 'outdoors',
  },
  {
    src: g(3),
    alt: 'A classroom with child-height wooden tables and chairs, open shelving, coat cubbies along the wall and a painted tree on the far wall',
    caption: 'A classroom set up with low wooden furniture and open shelving.',
    category: 'classrooms',
  },
  {
    src: g(4),
    alt: 'An activity room with a large building-block table, a plastic climbing dome and a space-themed wall panel',
    caption: 'Construction table and climbing dome in an activity room.',
    category: 'play',
  },
  {
    src: g(5),
    alt: 'A bright classroom with tall windows covered in rainbow-coloured artwork, wooden tables and chairs, and a ride-on toy car',
    caption: 'Window art catching the light in a toddler classroom.',
    category: 'classrooms',
  },
  {
    src: g(6),
    alt: 'A classroom with a large illustrated world map on the wall and shelving units filled with labelled storage bins',
    caption: 'Labelled storage and a world map wall.',
    category: 'classrooms',
  },
  {
    src: g(7),
    alt: 'A classroom with blue walls, a world map mural, a green pop-up tent, low tables and a wooden change unit',
    caption: 'A quiet tent and low tables in a younger room.',
    category: 'classrooms',
  },
  {
    src: g(8),
    alt: 'A dining area with a long low table surrounded by solid wooden chairs, cabinets above a counter and open cube shelving',
    caption: 'The table where meals and snacks happen.',
    category: 'kitchen',
  },
  {
    src: g(9),
    alt: 'A classroom with purple walls, a large painted tree hung with greenery, a wall of wooden birdhouses, a green tent and wooden tables',
    caption: 'The birdhouse wall and painted tree.',
    category: 'classrooms',
  },
  {
    src: g(10),
    alt: 'A forward-facing book display filled with picture books, beside a kitchenette counter and an open door to a child-height washroom',
    caption: 'Picture books at child height, next to the washroom.',
    category: 'around',
  },
  {
    src: g(11),
    alt: 'A classroom with coat cubbies, a teal utility cart, open wooden shelving and a play kitchen',
    caption: 'Cubbies, shelving and a play kitchen.',
    category: 'classrooms',
  },
  {
    src: g(12),
    alt: 'A large open play room with a high ceiling, blue accent wall, a soft foam ride-on track on the floor and low shelving',
    caption: 'The large play room, with a ride-on track laid out.',
    category: 'play',
    wide: true,
  },
  {
    src: g(13),
    alt: 'The outdoor play structure with a slide and climbing frame on artificial turf, a picnic bench to one side and snow along the fence line',
    caption: 'Outside in winter — the play structure and picnic bench.',
    category: 'outdoors',
  },
  {
    src: g(14),
    alt: 'A classroom with wall-mounted coat cubbies, wooden shelving units and small tables and chairs arranged across the room',
    caption: 'A classroom laid out in activity zones.',
    category: 'classrooms',
  },
  {
    src: g(15),
    alt: 'A large indoor gross-motor room with soft climbing shapes, rocking toys, a climbing structure with a slide and a sensory table',
    caption: 'The indoor gross-motor room, for days you cannot go outside.',
    category: 'play',
    wide: true,
  },
  {
    src: g(16),
    alt: 'The indoor gross-motor room seen from another angle, with a climbing frame, soft play shapes and a giant connect-four game',
    caption: 'The same room from the other end.',
    category: 'play',
  },
  {
    src: g(17),
    alt: 'A classroom with a circular alphabet rug, small chairs around low tables, notice boards and a painted tree on the wall',
    caption: 'Circle-time rug and notice boards.',
    category: 'classrooms',
  },
  {
    src: g(18),
    alt: 'A climbing dome and rocking toys on a padded mat in the gross-motor room, with patterned window film filtering daylight',
    caption: 'Climbing dome and rockers on padded flooring.',
    category: 'play',
  },
  {
    src: g(19),
    alt: 'A four-part collage showing a classroom, the outdoor play structure, a table area, the birdhouse wall and the large play room',
    caption: 'A collage across several of the spaces.',
    category: 'around',
    wide: true,
  },
  {
    src: g(20),
    alt: 'A four-part collage showing the play room, a classroom, a dining area and the outdoor play structure in snow',
    caption: 'Indoors and out, across a single day.',
    category: 'around',
    wide: true,
  },
];

export const videos = [
  {
    src: '/assets/video/story.mp4',
    title: 'Our story',
    blurb: 'A walkthrough of Tiny Stars from the front door inwards.',
    poster: g(3),
  },
  {
    src: '/assets/video/clip-1.mp4',
    title: 'Classroom fun',
    blurb: 'Inside one of the classrooms.',
    poster: g(17),
  },
  {
    src: '/assets/video/clip-2.mp4',
    title: 'Play and grow',
    blurb: 'The gross-motor room in use.',
    poster: g(15),
  },
  {
    src: '/assets/video/clip-3.mp4',
    title: 'Creative hub',
    blurb: 'Where making things happens.',
    poster: g(9),
  },
  {
    src: '/assets/video/clip-4.mp4',
    title: 'Daily highlights',
    blurb: 'Moments from around the centre.',
    poster: g(12),
  },
];

/**
 * The virtual tour is built from the same authentic photography, grouped into the
 * areas a family would actually walk through on a real 30-minute visit.
 */
export const tourStops = [
  {
    id: 'entry',
    name: 'Entry & cubbies',
    blurb:
      'Where the day starts and ends. Coat cubbies sit at child height so children can manage their own things — one of the small details that builds independence.',
    photos: [g(11), g(14), g(10)],
  },
  {
    id: 'classrooms',
    name: 'Classrooms',
    blurb:
      'Low furniture, open shelving and materials within reach. Every room is set up so a child can choose what to do without asking an adult to fetch it.',
    photos: [g(3), g(17), g(9), g(5), g(6), g(7)],
  },
  {
    id: 'play',
    name: 'Gross-motor room',
    blurb:
      'An indoor space for climbing, riding and moving — which matters a great deal in a Grande Prairie winter.',
    photos: [g(15), g(16), g(18), g(12), g(4)],
  },
  {
    id: 'meals',
    name: 'Kitchen & dining',
    blurb:
      'A full kitchen and a dedicated table for meals and snacks. Menus are not published online — ask to see the current one when you visit.',
    photos: [g(1), g(8)],
  },
  {
    id: 'outdoors',
    name: 'Outdoor play area',
    blurb:
      'Fenced, on artificial turf, with a climbing structure and picnic seating. Photographed in winter, which is the honest version.',
    photos: [g(2), g(13)],
  },
];
