/**
 * The current Tiny Stars promotion.
 *
 * This is a published fact, not marketing we wrote: it is the offer running on
 * tinystars.ca, quoted from the centre's own artwork. It sits in its own file
 * with an `active` switch because a promotion is the one kind of published fact
 * that expires on its own — and a daycare site still advertising a discount
 * that ended is the same category of error as inventing one.
 *
 * Note for whoever maintains this: it is a modal on the live site, injected by
 * script, so an automated fetch of tinystars.ca will not see it. It was read
 * from the artwork directly. Re-check it against the live site before a
 * production launch, and set `active: false` the day it ends.
 */

export interface Offer {
  /** Turn the whole thing off in one edit. */
  active: boolean;
  /** The big number, as written. */
  headline: string;
  /** What the number is about. */
  kicker: string;
  /** The offer itself, quoted. */
  terms: string;
  /** Why the centre is running it, in their words. */
  reason: string;
  /** Where the wording came from. */
  source: string;
  /** When someone last confirmed it against the live site. */
  confirmedOn: string;
  /**
   * Conditions Tiny Stars has NOT published. Listed so the site never implies
   * it knows them — an end date, an eligibility rule and how the discount is
   * applied are all things a parent will reasonably ask, and the team answers.
   */
  unstated: string[];
}

export const offer: Offer = {
  active: true,
  headline: '$100 off',
  kicker: '100 Tiny Stars',
  terms: 'New enrolments, for the first 2 months.',
  reason: 'Celebrating our growing Tiny Stars family.',
  source: 'tinystars.ca — current promotion',
  confirmedOn: '2026-08-28',
  unstated: [
    'when the offer ends',
    'whether it can be combined with subsidy',
    'how the discount is applied to an invoice',
  ],
};
