/**
 * Tour request intake.
 *
 * A preferred date is a preference, never a booking: the CRM records it as
 * `tours.status = 'requested'` and a person confirms it. The page says exactly
 * that, and must keep saying it — the parent's own 30-minute booking calendar
 * is still the only thing on the site that books a real slot.
 */
import { intakeRoute, statusRoute, clean, notesFrom } from '../../lib/crm/intake';
import { validateTourRequest } from '../../lib/crm/contract';

export const prerender = false;

export const POST = intakeRoute({
  type: 'tour.requested',
  validate: validateTourRequest,
  toContract: (f) => {
    const childName = clean(f.childName);
    const date = clean(f.date);
    return {
      guardian: {
        fullName: clean(f.parentName) ?? '',
        email: clean(f.email),
        phone: clean(f.phone),
      },
      child: childName ? { firstName: childName } : undefined,
      programInterest: clean(f.program),
      // The contract wants ISO dates; the field is <input type="date">, which
      // already gives us one. Anything else is dropped by the validator rather
      // than guessed at.
      preferredDates: date ? [date] : undefined,
      notes: notesFrom([
        clean(f.notes),
        clean(f.time) ? `Preferred time: ${clean(f.time)}` : undefined,
        clean(f.visitType) ? `Visit type: ${clean(f.visitType)}` : undefined,
      ]),
    };
  },
});

export const GET = statusRoute;
