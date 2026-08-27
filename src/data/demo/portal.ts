/**
 * SYNTHETIC DEMONSTRATION DATA — NOT REAL.
 *
 * Every name, note and timestamp in this file is invented for the preview. No real
 * child, family or educator is represented here, and nothing in this file comes
 * from Tiny Stars.
 *
 * The child is deliberately given a generic first name and no surname, no date of
 * birth, no photograph and no health information. A demo of a childcare portal
 * should model good data hygiene, not just show a pretty dashboard.
 */

export const DEMO_NOTICE =
  'Everything on this page is invented sample data for demonstration. No real child is shown.';

export const demoChild = {
  firstName: 'Ada',
  program: 'Comet Stars',
  ageLabel: '2 years',
  room: 'Toddler room',
  /** A generated monogram, not a photograph. */
  initials: 'A',
};

export const demoParent = {
  firstName: 'Sam',
  greeting: 'Good afternoon',
};

export interface DayCard {
  icon: string;
  label: string;
  value: string;
  detail: string;
  tone: 'ok' | 'neutral' | 'soft';
}

export const todayCards: DayCard[] = [
  {
    icon: 'sun',
    label: 'Mood',
    value: 'Settled',
    detail: 'A wobbly goodbye, then fine within about five minutes.',
    tone: 'ok',
  },
  {
    icon: 'apple',
    label: 'Meals',
    value: 'Ate most of lunch',
    detail: 'Went back for seconds of the pasta. Left the peppers.',
    tone: 'ok',
  },
  {
    icon: 'moon',
    label: 'Rest',
    value: '1 h 20 m',
    detail: 'Took a while to settle, then slept through.',
    tone: 'neutral',
  },
  {
    icon: 'palette',
    label: 'Creative',
    value: 'Printing with sponges',
    detail: 'Spent nearly twenty minutes on it, which is a long time at two.',
    tone: 'soft',
  },
  {
    icon: 'leaf',
    label: 'Outdoors',
    value: '45 minutes',
    detail: 'Mostly the climbing structure. Needed persuading to come in.',
    tone: 'ok',
  },
  {
    icon: 'bulb',
    label: 'Learning',
    value: 'Colour sorting',
    detail: 'Matched red and blue reliably today. Green is still a work in progress.',
    tone: 'soft',
  },
];

export interface Update {
  time: string;
  from: string;
  text: string;
  kind: 'note' | 'milestone' | 'reminder';
}

export const timeline: Update[] = [
  {
    time: '3:40 PM',
    from: 'Toddler room',
    kind: 'note',
    text: 'Ada helped tidy the block corner without being asked. First time we have seen that.',
  },
  {
    time: '2:15 PM',
    from: 'Toddler room',
    kind: 'milestone',
    text: 'Said “more please” as a full phrase at snack, twice.',
  },
  {
    time: '12:30 PM',
    from: 'Toddler room',
    kind: 'note',
    text: 'Lunch: pasta with tomato sauce, cucumber, apple slices. Ate well.',
  },
  {
    time: '10:05 AM',
    from: 'Toddler room',
    kind: 'reminder',
    text: 'Spare socks are running low — could you send another pair when you get a chance?',
  },
  {
    time: '8:20 AM',
    from: 'Toddler room',
    kind: 'note',
    text: 'Arrived a little teary but settled at the water table quickly.',
  },
];

export interface Announcement {
  date: string;
  title: string;
  body: string;
  pinned?: boolean;
}

export const announcements: Announcement[] = [
  {
    date: 'Yesterday',
    title: 'Family photo morning — next Friday',
    body: 'We will be taking room photographs on Friday morning. If you would prefer your child not to be included, just let us know at drop-off.',
    pinned: true,
  },
  {
    date: '3 days ago',
    title: 'Winter boots and snow pants',
    body: 'We go outside every day the weather allows. Please make sure boots, snow pants and mittens are labelled with your child’s name.',
  },
  {
    date: 'Last week',
    title: 'Parent handbook updated',
    body: 'A revised version of the parent handbook is now available in your documents.',
  },
];

export interface CalendarItem {
  day: string;
  weekday: string;
  title: string;
  note: string;
  soon?: boolean;
}

export const calendar: CalendarItem[] = [
  { day: '12', weekday: 'Fri', title: 'Family photo morning', note: 'Toddler room, 9:30 AM', soon: true },
  { day: '18', weekday: 'Thu', title: 'Library visit', note: 'Nova and Galaxy Stars' },
  { day: '25', weekday: 'Thu', title: 'Parent coffee morning', note: 'Front room, drop-in' },
  { day: '02', weekday: 'Mon', title: 'Centre closed', note: 'Statutory holiday' },
];

export interface Message {
  from: string;
  role: string;
  time: string;
  text: string;
  unread?: boolean;
}

export const messages: Message[] = [
  {
    from: 'Toddler room',
    role: 'Ada’s room',
    time: '3:45 PM',
    text: 'Just to let you know Ada had a small bump on her knee at outdoor time — cleaned it, no fuss, back playing within a minute. Incident note is in your documents.',
    unread: true,
  },
  {
    from: 'Office',
    role: 'Administration',
    time: 'Tuesday',
    text: 'Your updated emergency contact has been added. Thanks for sending that through.',
  },
];

export const portalDocuments = [
  { title: 'Parent Handbook', meta: 'PDF · updated last week', href: '/assets/pdf/parent-handbook.pdf', real: true },
  { title: 'Classroom Routine', meta: 'PDF', href: '/assets/pdf/classroom-routine.pdf', real: true },
  { title: 'Video Surveillance Policy', meta: 'PDF', href: '/assets/pdf/video-surveillance-policy.pdf', real: true },
  { title: 'Pet Policy', meta: 'PDF', href: '/assets/pdf/pet-policy.pdf', real: true },
  { title: 'Incident note — 8 Aug', meta: 'Sample document', href: '#', real: false },
  { title: 'Signed registration package', meta: 'Sample document', href: '#', real: false },
];
