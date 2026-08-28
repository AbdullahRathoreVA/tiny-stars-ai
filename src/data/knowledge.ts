/**
 * The Tiny Stars knowledge base.
 *
 * This is the single source of truth for the concierge, the FAQ and global search.
 * Every entry carries a `trust` level so the UI and the assistant can be honest
 * about where an answer comes from:
 *
 *   'verified' — published by Tiny Stars (website or policy document). Citable.
 *   'general'  — general early-childhood guidance written for this site. Clearly
 *                labelled, never presented as a Tiny Stars operational commitment.
 *   'unknown'  — Tiny Stars has not published this. The answer is a handoff, and the
 *                assistant must never guess a value.
 *
 * Adding an entry with trust:'verified' requires a real `source`.
 */

export type Trust = 'verified' | 'general' | 'unknown';

export type Topic =
  | 'programs'
  | 'enrollment'
  | 'tours'
  | 'safety'
  | 'daily-life'
  | 'policies'
  | 'contact'
  | 'careers'
  | 'families';

export interface Entry {
  id: string;
  topic: Topic;
  question: string;
  answer: string;
  trust: Trust;
  source?: string;
  /** Extra words that should match this entry in search / intent detection. */
  keywords: string[];
  /** Where to send the reader next. */
  links?: { label: string; href: string }[];
}

export const topicLabels: Record<Topic, string> = {
  programs: 'Programs',
  enrollment: 'Enrolment',
  tours: 'Tours',
  safety: 'Health & safety',
  'daily-life': 'Daily life',
  policies: 'Policies',
  contact: 'Contact',
  careers: 'Careers',
  families: 'For families',
};

export const knowledge: Entry[] = [
  // ---------------------------------------------------------------- programs
  {
    id: 'programs-list',
    topic: 'programs',
    question: 'What programs does Tiny Stars offer?',
    answer:
      'Tiny Stars runs five age-based programs: Twinkle Stars (12–18 months), Comet Stars (18 months–3 years), Nova Stars (3–5 years), Galaxy Stars (5–6 years, kindergarten and out-of-school care) and Cosmic Stars (6–12 years, out-of-school care). Learning Adventures enrichment classes are also offered for ages 2–5.',
    trust: 'verified',
    source: 'tinystars.ca — Our Programs',
    keywords: ['program', 'programs', 'ages', 'age range', 'classes', 'rooms', 'groups'],
    links: [{ label: 'Explore programs', href: '/programs' }],
  },
  {
    id: 'programs-age-2',
    topic: 'programs',
    question: 'Which program is right for a 2-year-old?',
    answer:
      'A 2-year-old falls into Comet Stars, the toddler program for 18 months to 3 years. Learning Adventures enrichment classes are also available from age 2.',
    trust: 'verified',
    source: 'tinystars.ca — Our Programs',
    keywords: ['2 year old', 'two year old', 'toddler', '18 months', 'comet'],
    links: [{ label: 'Comet Stars', href: '/programs/comet-stars' }],
  },
  {
    id: 'programs-infant-under-12m',
    topic: 'programs',
    question: 'Do you take babies under 12 months?',
    answer:
      'The youngest program listed on the Tiny Stars website is Twinkle Stars, which starts at 12 months. Whether younger infants can be accommodated is not published — please ask the team directly.',
    trust: 'unknown',
    keywords: ['newborn', 'under 12 months', 'baby', 'infant', '6 months', '9 months'],
    links: [{ label: 'Contact Tiny Stars', href: '/contact' }],
  },
  {
    id: 'programs-enrichment',
    topic: 'programs',
    question: 'What are Learning Adventures classes?',
    answer:
      'Learning Adventures are optional small-group enrichment classes for ages 2–5, letting children explore favourite interests or strengthen specific skills during the day.',
    trust: 'verified',
    source: 'tinystars.ca — Our Programs',
    keywords: ['enrichment', 'extra classes', 'learning adventures', 'activities', 'optional'],
    links: [{ label: 'Programs', href: '/programs' }],
  },

  // -------------------------------------------------------------------- tours
  {
    id: 'tour-book',
    topic: 'tours',
    question: 'How do I book a tour?',
    answer:
      'Tiny Stars books tours as 30-minute appointments through its online calendar. You can start from the Book a Tour page, or call (780) 230-1599.',
    trust: 'verified',
    source: 'tinystars.ca — Book a Tour (Calendly, 30 min)',
    keywords: ['tour', 'visit', 'book', 'appointment', 'see the centre', 'come in', 'look around'],
    links: [{ label: 'Book a tour', href: '/enroll/book-a-tour' }],
  },
  {
    id: 'tour-length',
    topic: 'tours',
    question: 'How long does a tour take?',
    answer: 'Tours are scheduled as 30-minute appointments.',
    trust: 'verified',
    source: 'Tiny Stars booking calendar',
    keywords: ['how long', 'duration', '30 minutes', 'tour length'],
    links: [{ label: 'Book a tour', href: '/enroll/book-a-tour' }],
  },
  {
    id: 'tour-prepare',
    topic: 'tours',
    question: 'What should I look for on a daycare tour?',
    answer:
      'Watch how educators speak to children when nobody is performing for you, how children settle after an upset, how entry and sign-out actually work, and whether the space feels calm rather than merely tidy. We have put together a full tour checklist you can tick off and take with you.',
    trust: 'general',
    keywords: ['prepare', 'what to ask', 'checklist', 'questions', 'what to look for', 'first visit'],
    links: [{ label: 'Tour preparation guide', href: '/enroll/tour-guide' }],
  },

  // ---------------------------------------------------------------- enrolment
  {
    id: 'enroll-how',
    topic: 'enrollment',
    question: 'How does enrolment work?',
    answer:
      'The usual path is: book a tour, meet the team and see the space, then complete the Tiny Stars registration package. If your preferred program is full, the waitlist is the next step.',
    trust: 'verified',
    source: 'tinystars.ca — Registration Package, Waitlist, Book a Tour',
    keywords: ['enrol', 'enroll', 'register', 'registration', 'sign up', 'join', 'start', 'apply'],
    links: [{ label: 'Enrolment guide', href: '/enroll/guide' }],
  },
  {
    id: 'enroll-what-needed',
    topic: 'enrollment',
    question: 'What information does the registration package ask for?',
    answer:
      'The Tiny Stars registration package covers parent/guardian information, emergency contacts, authorized pick-up persons, physician, medications and allergies, previous childcare, school information, food services, consents and permissions, the fees agreement, the aggressive behaviour policy, and a parent signature pack.',
    trust: 'verified',
    source: 'tinystars.ca — Registration Package',
    keywords: ['documents', 'paperwork', 'forms', 'what do i need', 'registration package', 'requirements'],
    links: [{ label: 'Enrolment guide', href: '/enroll/guide' }],
  },
  {
    id: 'enroll-cost',
    topic: 'enrollment',
    question: 'How much does it cost?',
    answer:
      'Tiny Stars does not publish tuition or fees on its website, so we will not estimate them here. The team can give you current rates for your child’s age and schedule — a tour or a quick call is the fastest way to get an accurate number.',
    trust: 'unknown',
    keywords: ['cost', 'price', 'fees', 'tuition', 'rates', 'monthly', 'how much', 'subsidy', 'afford'],
    links: [
      { label: 'Ask about fees', href: '/contact' },
      { label: 'Book a tour', href: '/enroll/book-a-tour' },
    ],
  },
  {
    id: 'enroll-availability',
    topic: 'enrollment',
    question: 'Do you have space available?',
    answer:
      'Live availability is not published on the website, and we will not guess at it. Availability changes by age group and schedule — the team can confirm today’s situation, and the waitlist keeps you in the queue if your program is full.',
    trust: 'unknown',
    keywords: ['availability', 'space', 'spots', 'openings', 'vacancy', 'full', 'room', 'waitlist'],
    links: [
      { label: 'Join the waitlist', href: '/enroll/waitlist' },
      { label: 'Contact Tiny Stars', href: '/contact' },
    ],
  },
  {
    id: 'enroll-waitlist',
    topic: 'enrollment',
    question: 'How does the waitlist work?',
    answer:
      'Tiny Stars runs a waitlist for families whose preferred program or start date is not immediately available. Joining the waitlist registers your interest — it is not a guarantee of placement, and the team will contact you about next steps.',
    trust: 'verified',
    source: 'tinystars.ca — Waitlist',
    keywords: ['waitlist', 'wait list', 'queue', 'waiting'],
    links: [{ label: 'Join the waitlist', href: '/enroll/waitlist' }],
  },

  // ------------------------------------------------------------------- safety
  {
    id: 'safety-overview',
    topic: 'safety',
    question: 'How does Tiny Stars keep children safe?',
    answer:
      'Tiny Stars describes itself as licensed and insured, with experienced staff, and states a commitment to "maintaining the highest standards of cleanliness and safety." It operates video surveillance under a published Video Surveillance Policy, and publishes a Pet Policy and a Parent Handbook covering procedures and expectations.',
    trust: 'verified',
    source: 'tinystars.ca — About Us, Video Surveillance Policy, Pet Policy',
    keywords: ['safe', 'safety', 'secure', 'security', 'protection', 'trust', 'licensed', 'insured'],
    links: [{ label: 'Trust Centre', href: '/why/trust-centre' }],
  },
  {
    id: 'safety-cameras',
    topic: 'safety',
    question: 'Are there cameras in the daycare?',
    answer:
      'Yes. Tiny Stars publishes a Video Surveillance Policy outlining the use of cameras for child safety, security and privacy within the facility. You can read the full policy in the Family Hub.',
    trust: 'verified',
    source: 'Tiny Stars Video Surveillance Policy',
    keywords: ['camera', 'cctv', 'surveillance', 'monitoring', 'watch', 'video'],
    links: [{ label: 'Video Surveillance Policy', href: '/assets/pdf/video-surveillance-policy.pdf' }],
  },
  {
    id: 'safety-ratios',
    topic: 'safety',
    question: 'What are your educator-to-child ratios?',
    answer:
      'Ratios are not published on the Tiny Stars website, and we will not state a number we cannot source. Ask on your tour — it is one of the most useful questions you can ask any centre, and you can also see the room for yourself.',
    trust: 'unknown',
    keywords: ['ratio', 'ratios', 'how many children', 'group size', 'staffing', 'class size'],
    links: [{ label: 'Book a tour', href: '/enroll/book-a-tour' }],
  },
  {
    id: 'safety-licence',
    topic: 'safety',
    question: 'Is Tiny Stars licensed?',
    answer:
      'Tiny Stars states that it is licensed and insured. The specific licence number is not published on the website — the team can provide it on request, and Alberta child care licensing records are publicly searchable.',
    trust: 'verified',
    source: 'tinystars.ca — footer trust markers',
    keywords: ['licence', 'license', 'licensed', 'accredited', 'certification', 'regulated', 'alberta'],
    links: [{ label: 'Trust Centre', href: '/why/trust-centre' }],
  },
  {
    id: 'safety-sick',
    topic: 'safety',
    question: 'What happens if my child gets sick?',
    answer:
      'Illness and exclusion procedures are set out in the Tiny Stars Parent Handbook rather than on the website. Please read the handbook or confirm the specifics with the team.',
    trust: 'unknown',
    keywords: ['sick', 'illness', 'fever', 'medication', 'unwell', 'exclusion', 'medicine'],
    links: [{ label: 'Parent Handbook', href: '/assets/pdf/parent-handbook.pdf' }],
  },

  // --------------------------------------------------------------- daily life
  {
    id: 'daily-routine',
    topic: 'daily-life',
    question: 'What does a typical day look like?',
    answer:
      'Tiny Stars publishes a Classroom Routine document describing the daily schedule of activities, meals, play and rest. It is the authoritative answer — the day at a glance on this site is a readable summary, not a substitute.',
    trust: 'verified',
    source: 'Tiny Stars Classroom Routine',
    keywords: ['day', 'daily', 'routine', 'schedule', 'timetable', 'typical day', 'what happens'],
    links: [
      { label: 'A day at Tiny Stars', href: '/day' },
      { label: 'Classroom Routine (PDF)', href: '/assets/pdf/classroom-routine.pdf' },
    ],
  },
  {
    id: 'daily-closing',
    topic: 'daily-life',
    question: 'What time do you close?',
    answer:
      'Tiny Stars closes at 6:00 PM. Opening time is not published on the website — please confirm it with the team.',
    trust: 'verified',
    source: 'Tiny Stars registration package — late pick-up fee policy',
    keywords: ['hours', 'close', 'closing', 'open', 'opening', 'what time', 'pickup time', 'drop off'],
    links: [{ label: 'Contact Tiny Stars', href: '/contact' }],
  },
  {
    // "Are you open on Saturday?" used to retrieve the closing-time entry and
    // answer with "closes at 6:00 PM", which does not address the question.
    // Which days the centre operates is genuinely not published, so this entry
    // exists to say that rather than to let a near-miss answer stand in.
    id: 'daily-days',
    topic: 'daily-life',
    question: 'Which days are you open? Are you open at weekends?',
    answer:
      'Which days Tiny Stars operates — including whether it opens at weekends or on statutory holidays — is not published on its website, so we will not state it here. The team can confirm the current schedule directly.',
    trust: 'unknown',
    keywords: [
      'saturday', 'sunday', 'weekend', 'weekends', 'weekday', 'weekdays',
      'which days', 'what days', 'days open', 'holiday', 'holidays', 'statutory',
      'monday', 'friday', 'seven days', 'every day',
    ],
    links: [{ label: 'Contact Tiny Stars', href: '/contact' }],
  },
  {
    id: 'daily-late',
    topic: 'daily-life',
    question: 'What happens if I am late picking up?',
    answer:
      'Tiny Stars closes at 6:00 PM and charges a late pick-up fee of $1.00 per minute from 6:01–6:15 PM and $2.00 per minute from 6:16–6:30 PM, per child, payable to the educator who stayed late. Fees are due within 24 hours. If a child has not been collected and no authorized individual can be reached, the RCMP is contacted.',
    trust: 'verified',
    source: 'Tiny Stars registration package — late pick-up fee policy',
    keywords: ['late', 'late fee', 'pick up', 'pickup', 'traffic', 'stuck at work', 'after 6'],
    links: [{ label: 'Trust Centre', href: '/why/trust-centre' }],
  },
  {
    id: 'daily-meals',
    topic: 'daily-life',
    question: 'What do children eat?',
    answer:
      'The registration package includes a Food Services section, so meals are handled as part of enrolment — but Tiny Stars does not publish menus online, and we will not invent one. Ask to see the current menu on your tour, especially if your child has allergies.',
    trust: 'unknown',
    keywords: ['food', 'meals', 'lunch', 'snack', 'menu', 'eat', 'allergy', 'allergies', 'nut free', 'diet'],
    links: [{ label: 'Book a tour', href: '/enroll/book-a-tour' }],
  },
  {
    id: 'daily-nap',
    topic: 'daily-life',
    question: 'How does nap and rest time work?',
    answer:
      'Rest is part of the published Classroom Routine. The document sets out how rest sits alongside meals, play and activities across the day.',
    trust: 'verified',
    source: 'Tiny Stars Classroom Routine',
    keywords: ['nap', 'sleep', 'rest', 'quiet time', 'cot', 'bed'],
    links: [{ label: 'Classroom Routine (PDF)', href: '/assets/pdf/classroom-routine.pdf' }],
  },
  {
    id: 'daily-settling',
    topic: 'daily-life',
    question: 'My child cries at drop-off. What helps?',
    answer:
      'Distress at separation is normal and usually eases within the first couple of weeks. What tends to help: a short, predictable goodbye rather than a long one or a sneaky exit; the same routine every morning; a familiar comfort object if the centre allows one; and asking your educator how long the crying actually lasted after you left — it is very often minutes. This is general guidance, not a Tiny Stars policy.',
    trust: 'general',
    keywords: ['crying', 'cries', 'upset', 'separation', 'anxiety', 'drop off', 'settling', 'nervous', 'worried', 'guilty'],
    links: [{ label: 'Family Hub', href: '/families/hub' }],
  },

  // ----------------------------------------------------------------- policies
  {
    id: 'policy-documents',
    topic: 'policies',
    question: 'Where can I read your policies?',
    answer:
      'Four documents are published: the Parent Handbook, the Classroom Routine, the Pet Policy and the Video Surveillance Policy. All four are available in the Family Hub.',
    trust: 'verified',
    source: 'tinystars.ca — Parents Zone',
    keywords: ['policy', 'policies', 'handbook', 'documents', 'rules', 'pdf', 'download'],
    links: [{ label: 'Family Hub documents', href: '/families/documents' }],
  },
  {
    id: 'policy-pets',
    topic: 'policies',
    question: 'Are there pets at the daycare?',
    answer:
      'Tiny Stars publishes a Pet Policy with guidelines on the presence of pets, covering children’s safety, hygiene and allergy awareness. Read the policy for the specifics.',
    trust: 'verified',
    source: 'Tiny Stars Pet Policy',
    keywords: ['pet', 'pets', 'animal', 'dog', 'cat', 'allergy'],
    links: [{ label: 'Pet Policy (PDF)', href: '/assets/pdf/pet-policy.pdf' }],
  },
  {
    id: 'policy-behaviour',
    topic: 'policies',
    question: 'What is your behaviour policy?',
    answer:
      'The registration package includes an Aggressive Behavior Policy that families review and sign as part of enrolment. The Parent Handbook is the fuller reference.',
    trust: 'verified',
    source: 'tinystars.ca — Registration Package',
    keywords: ['behaviour', 'behavior', 'discipline', 'biting', 'hitting', 'aggressive', 'time out'],
    links: [{ label: 'Parent Handbook', href: '/assets/pdf/parent-handbook.pdf' }],
  },

  // ------------------------------------------------------------------ contact
  {
    id: 'contact-how',
    topic: 'contact',
    question: 'How do I contact Tiny Stars?',
    answer:
      'Call (780) 230-1599, email info@tinystars.ca (or director@tinystars.ca for the director), or visit 10629 West Side Drive, Grande Prairie, Alberta T8V 8E6.',
    trust: 'verified',
    source: 'tinystars.ca — Contact',
    keywords: ['contact', 'phone', 'call', 'email', 'address', 'reach', 'talk', 'speak', 'human', 'someone'],
    links: [{ label: 'Contact page', href: '/contact' }],
  },
  {
    id: 'contact-where',
    topic: 'contact',
    question: 'Where are you located?',
    answer:
      'Tiny Stars is at 10629 West Side Drive, Grande Prairie, Alberta T8V 8E6. There is one location — anything else you see elsewhere is not us.',
    trust: 'verified',
    source: 'tinystars.ca — Contact',
    keywords: ['where', 'location', 'address', 'directions', 'map', 'grande prairie', 'find you', 'near me'],
    links: [{ label: 'Directions', href: '/contact' }],
  },

  // ------------------------------------------------------------------ careers
  {
    id: 'careers-apply',
    topic: 'careers',
    question: 'How do I apply for a job?',
    answer:
      'Tiny Stars accepts applications through its careers form, which asks for your details, preferred age group, expected wage and a resume upload (PDF, DOC or DOCX, up to 5MB).',
    trust: 'verified',
    source: 'tinystars.ca — Careers',
    keywords: ['job', 'career', 'work', 'hiring', 'apply', 'employment', 'position', 'resume', 'educator'],
    links: [{ label: 'Careers', href: '/careers' }],
  },
  {
    id: 'careers-openings',
    topic: 'careers',
    question: 'What positions are open right now?',
    answer:
      'Specific openings, wages and benefits are not published on the website. The application form asks for your preferred age group and expected wage, so applications are welcome regardless — the team will be in touch.',
    trust: 'unknown',
    keywords: ['openings', 'vacancies', 'salary', 'wage', 'benefits', 'pay', 'roles'],
    links: [{ label: 'Careers', href: '/careers' }],
  },

  // ----------------------------------------------------------------- families
  {
    id: 'families-updates',
    topic: 'families',
    question: 'How will I hear about my child’s day?',
    answer:
      'Tiny Stars has not published a specific parent-communication app or daily-report system on its website. The Family Hub on this site previews what that could look like, clearly marked as a demo. Ask the team how they currently keep families updated.',
    trust: 'unknown',
    keywords: ['updates', 'app', 'photos', 'communication', 'daily report', 'messages', 'portal', 'hear'],
    links: [{ label: 'Contact Tiny Stars', href: '/contact' }],
  },
  {
    id: 'families-first-day',
    topic: 'families',
    question: 'How do I prepare for the first day?',
    answer:
      'General preparation that helps most families: visit once more before the start date if you can, talk about it in simple positive terms without over-promising, shift wake-up and bedtimes a few days early, label everything, and plan a short first day if the centre allows it. Confirm the specific items to bring with Tiny Stars — the supply list is not published online.',
    trust: 'general',
    keywords: ['first day', 'starting', 'prepare', 'bring', 'ready', 'transition', 'new'],
    links: [{ label: 'Family Hub', href: '/families/hub' }],
  },
];

export const verifiedCount = knowledge.filter((k) => k.trust === 'verified').length;
export const unknownCount = knowledge.filter((k) => k.trust === 'unknown').length;

export function byTopic(topic: Topic): Entry[] {
  return knowledge.filter((e) => e.topic === topic);
}

export function entryById(id: string): Entry | undefined {
  return knowledge.find((e) => e.id === id);
}
