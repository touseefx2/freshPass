/**
 * Can customers pay this business in the app (Stripe Connect finished)?
 * Server flag: `payments_enabled` (business), `businessPaymentsEnabled`
 * (appointment), `paymentsEnabled` (plan / product / View & Pay).
 * Missing flag = older payload → keep today's behaviour (payments on).
 */
export const isPaymentsEnabled = (flag?: boolean | null): boolean =>
  flag !== false;
