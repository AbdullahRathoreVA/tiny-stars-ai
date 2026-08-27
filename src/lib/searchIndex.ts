/**
 * The global search corpus.
 *
 * Everything a family might look for, in one flat list: pages, programs, published
 * documents and every knowledge-base answer. Built at module scope so it is bundled
 * as static data — the search runs entirely in the browser with no request.
 */

import { knowledge, topicLabels } from '../data/knowledge';
import { programs, enrichment } from '../data/programs';
import { documents } from '../data/site';
import { Index } from './text';

export type ResultKind = 'page' | 'program' | 'answer' | 'document' | 'action';

export interface SearchDoc {
  id: string;
  title: string;
  body: string;
  href: string;
  kind: ResultKind;
  category: string;
  keywords: string;
}

const pages: SearchDoc[] = [
  {
    id: 'page-home',
    title: 'Home',
    body: 'Tiny Stars Daycare in Grande Prairie, Alberta. Safe, loving care for children 12 months to 12 years.',
    href: '/',
    kind: 'page',
    category: 'Pages',
    keywords: 'home start tiny stars daycare grande prairie alberta',
  },
  {
    id: 'page-why',
    title: 'Why Tiny Stars',
    body: 'Our story, our philosophy and how we work to earn your trust. Licensed and insured, experienced staff, family owned.',
    href: '/why',
    kind: 'page',
    category: 'Pages',
    keywords: 'about story philosophy family owned who we are values',
  },
  {
    id: 'page-trust',
    title: 'Trust Centre',
    body: 'Health and safety, licensing, published policies, video surveillance, pick-up procedures, and a plain list of what Tiny Stars has not published.',
    href: '/why/trust-centre',
    kind: 'page',
    category: 'Pages',
    keywords: 'trust safety health licensed insured policy secure surveillance camera emergency',
  },
  {
    id: 'page-questions',
    title: 'Questions parents forget to ask',
    body: 'The questions that reveal the most about a childcare centre, and why each one matters.',
    href: '/why/questions',
    kind: 'page',
    category: 'Pages',
    keywords: 'questions ask tour compare choosing evaluate',
  },
  {
    id: 'page-programs',
    title: 'All programs',
    body: 'Five age-based programs from 12 months to 12 years, plus Learning Adventures enrichment classes.',
    href: '/programs',
    kind: 'page',
    category: 'Pages',
    keywords: 'programs compare ages rooms groups all',
  },
  {
    id: 'page-day',
    title: 'A day at Tiny Stars',
    body: 'The rhythm of the day from arrival to pick-up: welcome, learning, play, outdoor time, meals, rest, creative activities and going home.',
    href: '/day',
    kind: 'page',
    category: 'Pages',
    keywords: 'day daily routine schedule timetable arrival pickup nap rest meals',
  },
  {
    id: 'page-learning',
    title: 'Learning journey',
    body: 'Language, curiosity, creativity, independence, social skills, problem solving, motor development and confidence.',
    href: '/learning',
    kind: 'page',
    category: 'Pages',
    keywords: 'learning development curriculum education school readiness milestones',
  },
  {
    id: 'page-gallery',
    title: 'Photo gallery',
    body: 'Photographs from inside Tiny Stars — learning, play, outdoor time, creative work and the spaces themselves.',
    href: '/experience/gallery',
    kind: 'page',
    category: 'Pages',
    keywords: 'gallery photos pictures images see look classroom',
  },
  {
    id: 'page-tour-virtual',
    title: 'Take a look around',
    body: 'Video walkthrough of the Tiny Stars spaces: classrooms, play areas, creative spaces and daily life.',
    href: '/experience/virtual-tour',
    kind: 'page',
    category: 'Pages',
    keywords: 'virtual tour video walkthrough rooms facility spaces look around',
  },
  {
    id: 'page-hub',
    title: 'Family Hub',
    body: 'Guides for every stage: choosing a centre, preparing for a tour, the first day, settling in, and what to expect.',
    href: '/families/hub',
    kind: 'page',
    category: 'Pages',
    keywords: 'family hub guides resources parent help advice tips',
  },
  {
    id: 'page-documents',
    title: 'Documents & policies',
    body: 'Parent Handbook, Classroom Routine, Pet Policy and Video Surveillance Policy — searchable and downloadable.',
    href: '/families/documents',
    kind: 'page',
    category: 'Pages',
    keywords: 'documents policies handbook pdf download routine pet surveillance',
  },
  {
    id: 'page-faq',
    title: 'Questions & answers',
    body: 'Every answer we have, grouped by topic, each labelled with where it comes from.',
    href: '/families/faq',
    kind: 'page',
    category: 'Pages',
    keywords: 'faq questions answers help common',
  },
  {
    id: 'page-parent',
    title: 'Parent Portal (preview)',
    body: 'A preview of daily updates, announcements, messages, calendar and documents for enrolled families. Demonstration only.',
    href: '/parent',
    kind: 'page',
    category: 'Pages',
    keywords: 'parent portal app daily updates messages login demo preview',
  },
  {
    id: 'page-careers',
    title: 'Careers',
    body: 'Working at Tiny Stars, and how to apply. Applications ask for your details, preferred age group, expected wage and a resume.',
    href: '/careers',
    kind: 'page',
    category: 'Pages',
    keywords: 'careers jobs hiring work employment apply educator teacher resume',
  },
  {
    id: 'page-contact',
    title: 'Contact',
    body: 'Phone, email, address and directions for Tiny Stars Daycare, 10629 West Side Drive, Grande Prairie, Alberta T8V 8E6.',
    href: '/contact',
    kind: 'page',
    category: 'Pages',
    keywords: 'contact phone email address directions map location call visit',
  },
];

const actions: SearchDoc[] = [
  {
    id: 'action-tour',
    title: 'Book a tour',
    body: 'Book a 30-minute visit to Tiny Stars.',
    href: '/enroll/book-a-tour',
    kind: 'action',
    category: 'Get started',
    keywords: 'book tour visit appointment schedule see come in',
  },
  {
    id: 'action-finder',
    title: 'Find your program',
    body: 'Answer three questions and get a clear next step.',
    href: '/enroll/find-your-program',
    kind: 'action',
    category: 'Get started',
    keywords: 'find program which right fit recommend quiz help choose',
  },
  {
    id: 'action-guide',
    title: 'Enrolment guide',
    body: 'What the registration package asks for, and the order of steps.',
    href: '/enroll/guide',
    kind: 'action',
    category: 'Get started',
    keywords: 'enrolment enrollment guide steps how register process',
  },
  {
    id: 'action-registration',
    title: 'Start registration',
    body: 'Begin the Tiny Stars registration in guided steps.',
    href: '/enroll/registration',
    kind: 'action',
    category: 'Get started',
    keywords: 'register registration sign up enrol form start',
  },
  {
    id: 'action-waitlist',
    title: 'Join the waitlist',
    body: 'Register interest when your preferred program or start date is full.',
    href: '/enroll/waitlist',
    kind: 'action',
    category: 'Get started',
    keywords: 'waitlist wait list queue full space',
  },
  {
    id: 'action-tour-guide',
    title: 'Prepare for your tour',
    body: 'A checklist of what to look for and what to ask, ready to take with you.',
    href: '/enroll/tour-guide',
    kind: 'action',
    category: 'Get started',
    keywords: 'tour checklist prepare questions ask what to look for',
  },
];

const programDocs: SearchDoc[] = [
  ...programs.map((p) => ({
    id: `program-${p.slug}`,
    title: `${p.name} · ${p.ageLabel}`,
    body: p.official,
    href: `/programs/${p.slug}`,
    kind: 'program' as const,
    category: 'Programs',
    keywords: `${p.name} ${p.familiar} ${p.ageLabel} ${p.priorities.join(' ')}`,
  })),
  {
    id: 'program-enrichment',
    title: `${enrichment.name} · ${enrichment.ageLabel}`,
    body: enrichment.official,
    href: '/programs',
    kind: 'program',
    category: 'Programs',
    keywords: 'enrichment learning adventures optional classes extra small group',
  },
];

const documentDocs: SearchDoc[] = documents.map((d) => ({
  id: `doc-${d.slug}`,
  title: d.title,
  body: d.description,
  href: d.file,
  kind: 'document' as const,
  category: 'Documents',
  keywords: `${d.category} pdf download policy document ${d.title}`,
}));

const answerDocs: SearchDoc[] = knowledge.map((e) => ({
  id: `answer-${e.id}`,
  title: e.question,
  body: e.answer,
  href:
    e.links?.[0]?.href ??
    `/families/faq#${e.id}`,
  kind: 'answer' as const,
  category: topicLabels[e.topic],
  keywords: e.keywords.join(' '),
}));

export const corpus: SearchDoc[] = [
  ...actions,
  ...programDocs,
  ...pages,
  ...answerDocs,
  ...documentDocs,
];

export const searchIndex = new Index<SearchDoc>(corpus, (d) => [
  { text: d.title, weight: 3.2 },
  { text: d.keywords, weight: 2.2 },
  { text: d.body, weight: 1 },
]);

/** Shown before the visitor types — the things families actually look for first. */
export const popularSearches = [
  { label: 'Book a tour', href: '/enroll/book-a-tour' },
  { label: 'Programs by age', href: '/programs' },
  { label: 'Parent Handbook', href: '/assets/pdf/parent-handbook.pdf' },
  { label: 'What time do you close?', href: '/families/faq#daily-closing' },
  { label: 'Is Tiny Stars licensed?', href: '/why/trust-centre' },
  { label: 'Contact', href: '/contact' },
];

export const kindLabels: Record<ResultKind, string> = {
  page: 'Page',
  program: 'Program',
  answer: 'Answer',
  document: 'Document',
  action: 'Action',
};
