/**
 * Client helpers for the FreshPass subscription lifecycle.
 * Gate entitlement on `hasAccess`, not the stored `status` column.
 * See backend SUBSCRIPTION_UI_GUIDE.md.
 */

export interface SubscriptionAccessFields {
  status?: string | null;
  stripeStatus?: string | null;
  hasAccess?: boolean;
  hasEnded?: boolean;
  endsAt?: string | null;
  trialStartsAt?: string | null;
  trialEndsAt?: string | null;
  nextPaymentDate?: string | null;
  deleted_at?: string | null;
}

export type SubscriptionDateKind =
  | "trialEnds"
  | "nextPayment"
  | "accessUntil"
  | "endedOn";

const CANCELLED_STATUSES = new Set(["cancelled", "canceled"]);

export function isStripeCancelled(
  stripeStatus?: string | null,
): boolean {
  if (!stripeStatus) return false;
  return CANCELLED_STATUSES.has(stripeStatus.trim().toLowerCase());
}

export function parseSubscriptionInstant(
  dateString?: string | null,
): Date | null {
  if (!dateString) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    const [month, day, year] = dateString.split("/").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isDateInFuture(dateString?: string | null): boolean {
  const parsed = parseSubscriptionInstant(dateString);
  if (!parsed) return false;
  return parsed.getTime() > Date.now();
}

/**
 * Does this subscription grant access right now?
 * Prefer the server flag; fall back to status + endsAt for older payloads.
 */
export function subscriptionGrantsAccess(
  sub: SubscriptionAccessFields,
): boolean {
  if (sub.deleted_at) return false;
  if (typeof sub.hasAccess === "boolean") return sub.hasAccess;

  const status = sub.status?.trim().toLowerCase();
  const endsAtHasPassed = Boolean(sub.endsAt) && !isDateInFuture(sub.endsAt);
  return status === "active" && !endsAtHasPassed;
}

export function subscriptionHasEnded(
  sub: SubscriptionAccessFields,
): boolean {
  if (typeof sub.hasEnded === "boolean") return sub.hasEnded;
  if (!sub.endsAt) return false;
  return !isDateInFuture(sub.endsAt);
}

/**
 * Live trial only. Do not use `hasTrialAvailable` — that is a purchase-screen
 * flag for whether the business can still claim a trial on a new plan.
 */
export function isSubscriptionTrialing(
  sub: SubscriptionAccessFields,
): boolean {
  if (isStripeCancelled(sub.stripeStatus)) return false;
  if (sub.stripeStatus?.trim().toLowerCase() === "trialing") return true;
  return Boolean(sub.trialEndsAt && isDateInFuture(sub.trialEndsAt));
}

export function getSubscriptionDateDisplay(
  sub: SubscriptionAccessFields,
): { kind: SubscriptionDateKind; date: string | null } {
  const cancelled = isStripeCancelled(sub.stripeStatus);
  const hasAccess = subscriptionGrantsAccess(sub);

  if (cancelled) {
    return {
      kind: hasAccess ? "accessUntil" : "endedOn",
      date: sub.endsAt ?? null,
    };
  }

  if (isSubscriptionTrialing(sub)) {
    return { kind: "trialEnds", date: sub.trialEndsAt ?? null };
  }

  return { kind: "nextPayment", date: sub.nextPaymentDate ?? null };
}

export function pickAccessibleSubscription<T extends SubscriptionAccessFields>(
  items: T[],
): T | null {
  return items.find((item) => subscriptionGrantsAccess(item)) ?? null;
}

/** Cancelled (or canceled) but entitlement has not ended yet — show repurchase CTA. */
export function canRepurchaseCancelledSubscription(
  sub: SubscriptionAccessFields,
): boolean {
  return isStripeCancelled(sub.stripeStatus) && subscriptionGrantsAccess(sub);
}
