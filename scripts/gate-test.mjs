/**
 * The centre-specific gate, tested offline.
 *
 *   node scripts/gate-test.mjs
 *
 * This list must stay identical to CENTRE_SPECIFIC in src/pages/api/concierge.ts.
 * It decides which questions are allowed to reach a general-knowledge model at
 * all, and it is the first line of defence — the model's own prompt is the
 * second. A leak here means a parent could be given a plausible-sounding fee or
 * ratio with no way to tell it from a published fact, which is the single
 * failure this site is built to prevent.
 *
 * Every entry below is a question that has to be blocked, or one that has to be
 * allowed through. Add to both lists when you touch the patterns.
 */
const PATTERNS = [
  'fees?', 'costs?', 'prices?', 'pricing', 'tuition', 'rates?', 'subsid\\w*', 'afford\\w*', 'deposit',
  'how much (?:is|are|do|does|would|will|per|for|to)', 'per month', 'per week', 'per day', 'a month', 'monthly', 'weekly',
  'charge', 'charges', 'expensive', 'cheap', 'budget',
  'availab\\w*', 'vacanc\\w*', 'openings?', 'waitlist', 'wait list', 'spots?',
  'ratios?', 'staff.to.child', 'how many (?:staff|educators|children|kids)',
  'closing time', 'opening time', 'what time (?:do|does|are)', 'hours',
  'saturdays?', 'sundays?', 'weekends?', 'which days', 'what days',
  'days (?:are |do )?(?:you )?open', 'open on', 'statutory', 'public holidays?',
  'menus?', 'meal plan',
  'licen[cs]\\w*', 'accredit\\w*',
  'staff names?', 'qualifications?', 'credentials?', 'who (?:works|looks after)',
];
const hit = (m) => PATTERNS.some((p) => new RegExp(`\\b${p}\\b`, 'i').test(m));

const MUST_BLOCK = [
  'Are you open on Saturday?', 'Are you open on weekends?', 'What days are you open?',
  'Which days do you run?', 'Do you open on public holidays?',
  'How much is it per month exactly?', 'What do you charge?', 'Is it expensive?',
  'How much per week?', 'What is the monthly amount?',
  'How much does it cost?', 'What are your fees?', 'What is the monthly price?',
  'Do you have any availability?', 'Any vacancies right now?', 'Is there a waitlist?',
  'Are there spots open?', 'What is your staff to child ratio?',
  'How many children per educator?', 'How many staff do you have?',
  'What time do you close?', 'What time does it open?', 'What are your hours?',
  'What is on the menu?', 'Do you have a meal plan?',
  'What is your licence number?', 'Are you licensed?', 'Are you accredited?',
  'What qualifications do the staff have?', 'Who works in the toddler room?',
  'Who looks after the babies?', 'Is there a deposit?', 'Do you take subsidy?',
  'Is it affordable?', 'What are the rates?', 'What are your tuition fees?',
  'closing time please', 'staff names?', 'what credentials do educators hold',
];

const MUST_PASS = [
  'How do I help my child settle in on the first day?',
  'My toddler bites other children, what should I do?',
  'How can I make drop-off easier?',
  'What should I pack for a preschooler?',
  'Is it normal for a two year old not to talk much?',
  'How do I prepare my child for starting daycare?',
  'What questions should I ask on a tour?',
  'My child cries every morning, is that normal?',
  'How do I know if my child is ready for kindergarten?',
  'What is separation anxiety?',
  'How much sleep does a 3 year old need?',
  'Tips for potty training?',
];

let bad = 0;
for (const m of MUST_BLOCK) if (!hit(m)) { console.log('LEAK  (should block):', m); bad++; }
for (const m of MUST_PASS) if (hit(m)) { console.log('BLOCK (should pass) :', m); bad++; }
console.log(`\nblocked ${MUST_BLOCK.length} centre-specific, allowed ${MUST_PASS.length} general`);
console.log(bad ? `FAILURES: ${bad}` : 'gate correct on all ' + (MUST_BLOCK.length + MUST_PASS.length) + ' cases');
