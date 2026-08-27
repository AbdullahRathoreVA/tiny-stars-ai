export interface NavLink {
  label: string;
  href: string;
  desc?: string;
  demo?: boolean;
}

export interface NavGroup {
  label: string;
  href: string;
  /** Short line shown at the top of the desktop dropdown. */
  summary: string;
  links: NavLink[];
  /** Optional promoted card on the right of the dropdown. */
  feature?: { label: string; desc: string; href: string; image: string };
}

export const nav: NavGroup[] = [
  {
    label: 'Why Tiny Stars',
    href: '/why',
    summary: 'Who we are, and how we earn your trust.',
    links: [
      { label: 'Our story & philosophy', href: '/why', desc: 'What Tiny Stars believes and why' },
      { label: 'Trust Centre', href: '/why/trust-centre', desc: 'Safety, policies and what we can prove' },
      { label: 'Learning & development', href: '/learning', desc: 'What your child is actually building' },
      { label: 'Questions parents forget to ask', href: '/why/questions', desc: 'The ones that matter most' },
    ],
    feature: {
      label: 'Every claim, sourced',
      desc: 'We label what Tiny Stars has published, what is general guidance, and what only the team can confirm.',
      href: '/why/trust-centre',
      image: '/assets/images/sections/talent-and-trust.webp',
    },
  },
  {
    label: 'Programs',
    href: '/programs',
    summary: 'Five age groups, 12 months to 12 years.',
    links: [
      { label: 'Twinkle Stars', href: '/programs/twinkle-stars', desc: 'Babies · 12–18 months' },
      { label: 'Comet Stars', href: '/programs/comet-stars', desc: 'Toddlers · 18 months–3 years' },
      { label: 'Nova Stars', href: '/programs/nova-stars', desc: 'Preschool · 3–5 years' },
      { label: 'Galaxy Stars', href: '/programs/galaxy-stars', desc: 'Kindergarten & OOSC · 5–6 years' },
      { label: 'Cosmic Stars', href: '/programs/cosmic-stars', desc: 'Out-of-school care · 6–12 years' },
      { label: 'Compare all programs', href: '/programs', desc: 'Side by side, including enrichment' },
    ],
    feature: {
      label: 'Not sure which fits?',
      desc: 'Answer three questions and we will point you at the right program and the right next step.',
      href: '/enroll/find-your-program',
      image: '/assets/images/programs/toddler.webp',
    },
  },
  {
    label: 'Your child’s day',
    href: '/day',
    summary: 'What actually happens between drop-off and pick-up.',
    links: [
      { label: 'A day at Tiny Stars', href: '/day', desc: 'The rhythm of the day, hour by hour' },
      { label: 'Photo gallery', href: '/experience/gallery', desc: '20 photos from the centre' },
      { label: 'Take a look around', href: '/experience/virtual-tour', desc: 'Video walkthrough' },
      { label: 'Learning journey', href: '/learning', desc: 'Language, confidence, independence' },
    ],
    feature: {
      label: 'See it before you visit',
      desc: 'Real photos and video from Tiny Stars — not stock imagery.',
      href: '/experience/virtual-tour',
      image: '/assets/images/sections/classrooms-and-learning.webp',
    },
  },
  {
    label: 'For families',
    href: '/families/hub',
    summary: 'Guides, documents and answers.',
    links: [
      { label: 'Family Hub', href: '/families/hub', desc: 'Guides for every stage' },
      { label: 'Documents & policies', href: '/families/documents', desc: 'Handbook, routine, pet, surveillance' },
      { label: 'Questions & answers', href: '/families/faq', desc: 'Searchable, with sources' },
      { label: 'Parent Portal', href: '/parent', desc: 'A preview of what comes next', demo: true },
    ],
    feature: {
      label: 'Four published policies',
      desc: 'Parent Handbook, Classroom Routine, Pet Policy and Video Surveillance Policy — read them before you visit.',
      href: '/families/documents',
      image: '/assets/images/sections/health-and-safety.webp',
    },
  },
  {
    label: 'Enrol',
    href: '/enroll',
    summary: 'Tour, register, or join the waitlist.',
    links: [
      { label: 'Find your program', href: '/enroll/find-your-program', desc: 'Three questions, one clear next step' },
      { label: 'Book a tour', href: '/enroll/book-a-tour', desc: '30 minutes, in person' },
      { label: 'Prepare for your tour', href: '/enroll/tour-guide', desc: 'Checklist you can take with you' },
      { label: 'Enrolment guide', href: '/enroll/guide', desc: 'What the paperwork actually asks' },
      { label: 'Registration', href: '/enroll/registration', desc: 'Start your registration' },
      { label: 'Join the waitlist', href: '/enroll/waitlist', desc: 'If your program is full' },
    ],
    feature: {
      label: 'Start with a tour',
      desc: 'Nothing on a website replaces standing in the room. Tours are 30 minutes.',
      href: '/enroll/book-a-tour',
      image: '/assets/images/sections/cta.webp',
    },
  },
];

export const utilityNav: NavLink[] = [
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
];

export const footerNav = [
  {
    title: 'Programs',
    links: [
      { label: 'Twinkle Stars · 12–18 mo', href: '/programs/twinkle-stars' },
      { label: 'Comet Stars · 18 mo–3 yr', href: '/programs/comet-stars' },
      { label: 'Nova Stars · 3–5 yr', href: '/programs/nova-stars' },
      { label: 'Galaxy Stars · 5–6 yr', href: '/programs/galaxy-stars' },
      { label: 'Cosmic Stars · 6–12 yr', href: '/programs/cosmic-stars' },
    ],
  },
  {
    title: 'Explore',
    links: [
      { label: 'Why Tiny Stars', href: '/why' },
      { label: 'Trust Centre', href: '/why/trust-centre' },
      { label: 'A day at Tiny Stars', href: '/day' },
      { label: 'Learning journey', href: '/learning' },
      { label: 'Gallery', href: '/experience/gallery' },
      { label: 'Take a look around', href: '/experience/virtual-tour' },
    ],
  },
  {
    title: 'Families',
    links: [
      { label: 'Family Hub', href: '/families/hub' },
      { label: 'Documents & policies', href: '/families/documents' },
      { label: 'Questions & answers', href: '/families/faq' },
      { label: 'Tour preparation', href: '/enroll/tour-guide' },
      { label: 'Parent Portal (demo)', href: '/parent' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Book a tour', href: '/enroll/book-a-tour' },
      { label: 'Find your program', href: '/enroll/find-your-program' },
      { label: 'Enrolment guide', href: '/enroll/guide' },
      { label: 'Registration', href: '/enroll/registration' },
      { label: 'Waitlist', href: '/enroll/waitlist' },
      { label: 'Careers', href: '/careers' },
    ],
  },
];
