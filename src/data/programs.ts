/**
 * Program data.
 *
 * `official` = verbatim/near-verbatim from https://tinystars.ca/our-programs (VERIFIED).
 * `stageNotes` = general early-childhood context written for this site. It is NOT a
 *   Tiny Stars operational claim and is labelled as general guidance wherever shown.
 * Nothing here states ratios, staffing, menus, fees or availability — none of which
 * Tiny Stars has published.
 */

export type Priority =
  | 'safety'
  | 'learning'
  | 'social'
  | 'creativity'
  | 'routine'
  | 'outdoor'
  | 'communication';

export interface ProgramQuestion {
  q: string;
  a: string;
  verified: boolean;
}

export interface Program {
  slug: string;
  name: string;
  familiar: string;
  ageLabel: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  blurb: string;
  official: string;
  officialSource: string;
  stageNotes: string[];
  priorities: Priority[];
  image: string;
  accent: 'blush' | 'marigold' | 'teal' | 'violet' | 'sky';
  questions: ProgramQuestion[];
}

export const programs: Program[] = [
  {
    slug: 'twinkle-stars',
    name: 'Twinkle Stars',
    familiar: 'Babies',
    ageLabel: '12–18 months',
    ageMinMonths: 12,
    ageMaxMonths: 18,
    blurb: 'First steps, first words, first friendships — held gently.',
    official:
      'Our Infant Care program is thoughtfully created to support babies during this important stage of growth and development, with a cozy, secure environment and trained staff providing personalized attention.',
    officialSource: 'tinystars.ca — Our Programs',
    stageNotes: [
      'Between one and one and a half, most babies move from cruising to walking, and from sounds to first real words.',
      'Attachment matters more than curriculum at this age. Consistent, familiar adults are what let a baby feel brave enough to explore.',
      'Separation is normally hardest in the first two weeks. A predictable goodbye routine helps more than a quick exit.',
    ],
    priorities: ['safety', 'routine', 'communication'],
    image: '/assets/images/programs/infant.webp',
    accent: 'blush',
    questions: [
      {
        q: 'What ages does Twinkle Stars take?',
        a: 'Twinkle Stars is for babies 12–18 months.',
        verified: true,
      },
      {
        q: 'What does the daily routine look like?',
        a: 'Tiny Stars publishes a Classroom Routine document covering activities, meals, play and rest. You can read it in the Family Hub.',
        verified: true,
      },
      {
        q: 'What do I need to bring?',
        a: 'Tiny Stars has not published a supply list on the website. The Parent Handbook and your tour are the right places to confirm this.',
        verified: false,
      },
    ],
  },
  {
    slug: 'comet-stars',
    name: 'Comet Stars',
    familiar: 'Toddlers',
    ageLabel: '18 months – 3 years',
    ageMinMonths: 18,
    ageMaxMonths: 36,
    blurb: 'Big feelings, bigger curiosity, and room to run at both.',
    official:
      'Our Toddler program is designed specifically for curious little explorers in this exciting stage of growth. Staff encourage hands-on exploration and help build confidence and independence.',
    officialSource: 'tinystars.ca — Our Programs',
    stageNotes: [
      'Toddlers learn with their whole body. Climbing, pouring, stacking and knocking down is the curriculum, not a break from it.',
      'Language expands fast in this window — often from a handful of words to hundreds. Narration from adults is the fuel.',
      'Sharing is a skill, not a personality trait. Most children are not developmentally ready to share reliably until closer to three.',
    ],
    priorities: ['learning', 'social', 'outdoor', 'creativity'],
    image: '/assets/images/programs/toddler.webp',
    accent: 'marigold',
    questions: [
      {
        q: 'My child is 2 and not fully toilet trained. Is that a problem?',
        a: 'Toilet-learning expectations are not published on the Tiny Stars website. This is a good question for your tour — the team can tell you exactly how they handle it.',
        verified: false,
      },
      {
        q: 'How does Tiny Stars handle biting or hitting?',
        a: 'The Tiny Stars registration package includes an Aggressive Behavior Policy. Ask for it during your tour, or read the Parent Handbook.',
        verified: true,
      },
    ],
  },
  {
    slug: 'nova-stars',
    name: 'Nova Stars',
    familiar: 'Preschoolers',
    ageLabel: '3–5 years',
    ageMinMonths: 36,
    ageMaxMonths: 60,
    blurb: 'Where "I can’t" quietly turns into "watch me".',
    official:
      'Our Preschool program is designed to support children as they take important steps toward independence and learning, balancing structured lessons with playful exploration to build school-readiness skills.',
    officialSource: 'tinystars.ca — Our Programs',
    stageNotes: [
      'School readiness is much less about letters and numbers than about separating calmly, following a two-step instruction, and asking an adult for help.',
      'Pretend play is cognitive heavy lifting: it is where children rehearse negotiation, sequencing and empathy.',
      'Writing their own name is usually the milestone families notice — it sits on top of months of fine-motor work with scissors, tongs and playdough.',
    ],
    priorities: ['learning', 'social', 'creativity', 'routine'],
    image: '/assets/images/programs/preschool.webp',
    accent: 'teal',
    questions: [
      {
        q: 'Does Nova Stars prepare children for kindergarten?',
        a: 'Tiny Stars states it prepares children "not only for kindergarten, but for a bright and confident start to all the adventures that follow."',
        verified: true,
      },
      {
        q: 'Are there extra classes available?',
        a: 'Yes — Learning Adventures enrichment classes are offered for ages 2–5 as optional small groups during the day.',
        verified: true,
      },
    ],
  },
  {
    slug: 'galaxy-stars',
    name: 'Galaxy Stars',
    familiar: 'Kindergarten & OOSC',
    ageLabel: '5–6 years',
    ageMinMonths: 60,
    ageMaxMonths: 72,
    blurb: 'The bridge between the classroom and home.',
    official:
      'Our program is tailored to meet the needs of school-aged children, providing care and guidance beyond the classroom — a safe space for learning, play, and relaxation outside school hours.',
    officialSource: 'tinystars.ca — Our Programs',
    stageNotes: [
      'Children starting kindergarten are often at their most tired in the late afternoon. Downtime is not wasted time.',
      'Mixed-age play with slightly older children is one of the strongest drivers of confidence at this age.',
    ],
    priorities: ['safety', 'social', 'routine'],
    image: '/assets/images/programs/kindergarden.webp',
    accent: 'violet',
    questions: [
      {
        q: 'Is there transportation to and from school?',
        a: 'Transportation arrangements are not published on the Tiny Stars website. Please confirm this with the team directly.',
        verified: false,
      },
    ],
  },
  {
    slug: 'cosmic-stars',
    name: 'Cosmic Stars',
    familiar: 'Out-of-School Care',
    ageLabel: '6–12 years',
    ageMinMonths: 72,
    ageMaxMonths: 144,
    blurb: 'Homework, projects, and somewhere to just be a kid after three.',
    official:
      'Designed for children ages 6–12, our program extends support and supervision beyond school hours, including homework help, creative projects, and recreational activities.',
    officialSource: 'tinystars.ca — Our Programs',
    stageNotes: [
      'Older children benefit most from genuine choice — a say in what they do after school is what keeps them engaged rather than parked.',
      'Homework support works best as a quiet space and an available adult, not as a second school day.',
    ],
    priorities: ['learning', 'social', 'creativity', 'routine'],
    image: '/assets/images/programs/out-of-school.webp',
    accent: 'sky',
    questions: [
      {
        q: 'Is homework help included?',
        a: 'Yes — Tiny Stars lists homework help, creative projects and recreational activities in the Cosmic Stars program.',
        verified: true,
      },
    ],
  },
];

export const enrichment = {
  slug: 'learning-adventures',
  name: 'Learning Adventures',
  ageLabel: 'Ages 2–5',
  official:
    'Optional small group enrichment classes allowing children to explore their favourite interests or strengthen important skills during the day.',
  officialSource: 'tinystars.ca — Our Programs',
  image: '/assets/images/programs/enrichment.webp',
};

export const priorityLabels: Record<Priority, { label: string; help: string }> = {
  safety: { label: 'Safety & security', help: 'Entry, supervision, policies, surveillance' },
  learning: { label: 'Early learning', help: 'Curriculum, school readiness, development' },
  social: { label: 'Social confidence', help: 'Friendships, sharing, group play' },
  creativity: { label: 'Creativity', help: 'Art, music, imagination, making things' },
  routine: { label: 'Predictable routine', help: 'Meals, rest, structure to the day' },
  outdoor: { label: 'Outdoor time', help: 'Fresh air and gross-motor play' },
  communication: { label: 'Parent communication', help: 'How you hear about the day' },
};

export function programForAgeMonths(months: number): Program | undefined {
  return (
    programs.find((p) => months >= p.ageMinMonths && months < p.ageMaxMonths) ??
    (months >= 144 ? undefined : months < 12 ? undefined : programs[programs.length - 1])
  );
}

export function programBySlug(slug: string): Program | undefined {
  return programs.find((p) => p.slug === slug);
}
