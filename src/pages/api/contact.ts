/**
 * Contact form intake.
 *
 * The CRM files this as a lead plus a note and raises a notification. It never
 * replies on its own: a person reads the message and answers it.
 */
import { intakeRoute, statusRoute, clean } from '../../lib/crm/intake';
import { validateContact } from '../../lib/crm/contract';

export const prerender = false;

export const POST = intakeRoute({
  type: 'contact.created',
  validate: validateContact,
  toContract: (f) => ({
    guardian: {
      fullName: clean(f.name) ?? '',
      email: clean(f.email),
      phone: clean(f.phone),
    },
    subject: clean(f.topic),
    message: clean(f.message) ?? '',
  }),
});

export const GET = statusRoute;
