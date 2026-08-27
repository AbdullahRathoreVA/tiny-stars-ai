/**
 * VERIFIED FACTS ONLY.
 * Every value in this file was read directly from https://tinystars.ca on 2026-08-27.
 * Nothing here may be invented. If a fact is not on the production site or in a
 * published Tiny Stars document, it belongs in `unverified.ts` instead.
 */

export const VERIFIED_ON = '2026-08-27';

export const site = {
  name: 'Tiny Stars Daycare',
  shortName: 'Tiny Stars',
  legalArea: 'Grande Prairie, Alberta',
  tagline: 'Safe, Loving Care for Growing Minds',
  productionUrl: 'https://tinystars.ca',
  demoUrl: 'https://tinystars.ca',
  address: {
    street: '10629 West Side Drive',
    city: 'Grande Prairie',
    region: 'Alberta',
    regionCode: 'AB',
    postalCode: 'T8V 8E6',
    country: 'Canada',
    countryCode: 'CA',
    full: '10629 West Side Drive, Grande Prairie, Alberta T8V 8E6',
  },
  phone: {
    label: '(780) 230-1599',
    href: 'tel:+17802301599',
    role: 'Director',
  },
  email: {
    general: 'info@tinystars.ca',
    director: 'director@tinystars.ca',
  },
  social: {
    facebook: 'https://www.facebook.com/profile.php?id=61579659993235',
    instagram: 'https://instagram.com/tinystarsgrandeprairie',
    tiktok: 'https://tiktok.com/@tinystarsgp',
  },
  /** Real Calendly booking used by the production site: 30-minute tour slots. */
  calendly: 'https://calendly.com/tinystars-info/30min',
  mapsQuery: '10629 West Side Drive, Grande Prairie, AB T8V 8E6',
} as const;

/**
 * Trust markers published on the production site footer.
 * These are the ONLY credential-style claims Tiny Stars currently makes publicly.
 */
export const trustMarkers = [
  {
    label: 'Licensed & Insured',
    detail: 'Stated on the Tiny Stars website.',
    icon: 'shield',
  },
  {
    label: 'Experienced Staff',
    detail: 'Stated on the Tiny Stars website.',
    icon: 'people',
  },
  {
    label: 'Family Owned',
    detail: 'Stated on the Tiny Stars website.',
    icon: 'heart',
  },
] as const;

/**
 * Facts drawn from published Tiny Stars policy documents (registration package /
 * parent handbook). Each carries its source so the UI and the concierge can cite it.
 */
export const policyFacts = [
  {
    id: 'closing-time',
    claim: 'Tiny Stars closes at 6:00 PM.',
    source: 'Tiny Stars registration package — late pick-up fee policy',
  },
  {
    id: 'late-fee',
    claim:
      'Late pick-up fees are $1.00 per minute from 6:01–6:15 PM and $2.00 per minute from 6:16–6:30 PM, per child, payable to the educator who stayed late. Fees are due within 24 hours.',
    source: 'Tiny Stars registration package — late pick-up fee policy',
  },
  {
    id: 'late-escalation',
    claim:
      'If a child has not been picked up by 6:00 PM, authorized pick-up and emergency contacts are called. If no authorized individual can be located, the RCMP is contacted.',
    source: 'Tiny Stars registration package — late pick-up fee policy',
  },
  {
    id: 'surveillance',
    claim:
      'Tiny Stars operates video surveillance and publishes a Video Surveillance Policy covering child safety, security and privacy.',
    source: 'Tiny Stars Video Surveillance Policy',
  },
  {
    id: 'pets',
    claim:
      'Tiny Stars publishes a Pet Policy covering children’s safety, hygiene and allergy awareness.',
    source: 'Tiny Stars Pet Policy',
  },
  {
    id: 'tour-length',
    claim: 'Tours are booked as 30-minute appointments.',
    source: 'Tiny Stars Calendly booking link',
  },
] as const;

/** Published parent documents, mirrored from the production Parents Zone. */
export const documents = [
  {
    slug: 'classroom-routine',
    title: 'Classroom Routine',
    description:
      'Daily schedule of activities, meals, play, and rest to provide structure and consistency for children.',
    file: '/assets/pdf/classroom-routine.pdf',
    category: 'Daily life',
  },
  {
    slug: 'parent-handbook',
    title: 'Parent Handbook',
    description:
      'A guide outlining daycare policies, procedures, expectations, and important information for families.',
    file: '/assets/pdf/parent-handbook.pdf',
    category: 'Policies',
  },
  {
    slug: 'pet-policy',
    title: 'Pet Policy',
    description:
      'Guidelines regarding the presence of pets to ensure children’s safety, hygiene, and allergy awareness.',
    file: '/assets/pdf/pet-policy.pdf',
    category: 'Health & safety',
  },
  {
    slug: 'video-surveillance-policy',
    title: 'Video Surveillance Policy',
    description:
      'Outlines the use of cameras to ensure child safety, security, and privacy within the daycare facility.',
    file: '/assets/pdf/video-surveillance-policy.pdf',
    category: 'Health & safety',
  },
] as const;

/**
 * Sections the real Tiny Stars registration package asks for.
 * Used to set honest expectations before a family starts enrolling.
 */
export const registrationSections = [
  'Parent/Guardian Information',
  'Emergency Contacts',
  'Authorized Pick-up Persons',
  'Physician, Medications, Allergies',
  'Previous Childcare',
  'School Information',
  'Food Services',
  'Consents & Permissions',
  'Fees Agreement',
  'Aggressive Behavior Policy',
  'Parent Signature Pack',
] as const;

/**
 * Things Tiny Stars has NOT published. The concierge, the schema markup and every
 * page must treat these as unknown and route the family to a human.
 */
export const unverified = [
  'opening time',
  'tuition and fees',
  'current availability or vacancies',
  'staff names, photographs and credentials',
  'educator-to-child ratios',
  'licence number',
  'menus and specific meal plans',
  'testimonials and reviews',
  'statutory holiday closures',
] as const;
