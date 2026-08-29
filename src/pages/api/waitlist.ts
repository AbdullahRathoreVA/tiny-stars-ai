/**
 * Waitlist intake.
 *
 * Shares the tour contract — the CRM branches on the event type, putting the
 * lead at the `waitlist` stage and creating no tour. The earliest start date
 * goes in the notes because the contract has no field for it; inventing one
 * here would put the two repos' copies of the contract out of step.
 */
import { intakeRoute, statusRoute, clean, notesFrom } from '../../lib/crm/intake';
import { validateTourRequest } from '../../lib/crm/contract';

export const prerender = false;

export const POST = intakeRoute({
  type: 'waitlist.requested',
  validate: validateTourRequest,
  toContract: (f) => ({
    guardian: {
      fullName: clean(f.parentName) ?? '',
      email: clean(f.email),
      phone: clean(f.phone),
    },
    programInterest: clean(f.program),
    notes: notesFrom([
      clean(f.startDate) ? `Earliest start wanted: ${clean(f.startDate)}` : undefined,
    ]),
  }),
});

export const GET = statusRoute;
